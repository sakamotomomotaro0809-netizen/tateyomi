import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { PipelineStore } from "../storage/pipeline-store.js";
import { SequenceEngine } from "../outreach/sequence-engine.js";

export default class GetSequenceStatusTool extends AbstractTool {
  private readonly pipelineStore: PipelineStore;
  private readonly sequenceEngine: SequenceEngine;

  constructor(pipelineStore: PipelineStore, sequenceEngine: SequenceEngine) {
    super();
    this.pipelineStore = pipelineStore;
    this.sequenceEngine = sequenceEngine;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_get_sequence_status",
      "シーケンスの進捗状況を確認。現在のステップ、次のアクション、完了率を表示。",
      {
        sequenceId: z.string().describe("シーケンスID"),
        action: z
          .enum(["status", "advance", "pause", "resume", "cancel"])
          .optional()
          .describe("実行アクション (省略時はstatus)"),
      },
      async ({ sequenceId, action }) => {
        try {
          const currentAction = action ?? "status";

          let sequence = this.pipelineStore.getSequenceById(sequenceId);
          if (!sequence) {
            return createErrorResponse(
              `シーケンスが見つかりません: ${sequenceId}`
            );
          }

          switch (currentAction) {
            case "advance":
              sequence = this.sequenceEngine.advanceSequence(sequenceId);
              break;
            case "pause":
              sequence = this.sequenceEngine.pauseSequence(sequenceId);
              break;
            case "resume":
              sequence = this.sequenceEngine.resumeSequence(sequenceId);
              break;
            case "cancel":
              sequence = this.sequenceEngine.cancelSequence(sequenceId);
              break;
            case "status":
            default:
              break;
          }

          const nextStep = this.sequenceEngine.getNextStep(sequence);
          const completedSteps = sequence.steps.filter(
            (s) => s.status === "sent"
          ).length;
          const totalSteps = sequence.steps.length;
          const completionRate =
            totalSteps > 0
              ? Math.round((completedSteps / totalSteps) * 100)
              : 0;

          return createSuccessResponse({
            sequence,
            progress: {
              completedSteps,
              totalSteps,
              completionRate: `${completionRate}%`,
              currentStep: sequence.currentStep,
              nextStep,
            },
            actionPerformed: currentAction,
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`シーケンス操作失敗: ${msg}`);
        }
      }
    );
  }
}

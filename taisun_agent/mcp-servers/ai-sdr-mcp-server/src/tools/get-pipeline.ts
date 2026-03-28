import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { PipelineStore } from "../storage/pipeline-store.js";

export default class GetPipelineTool extends AbstractTool {
  private readonly pipelineStore: PipelineStore;

  constructor(pipelineStore: PipelineStore) {
    super();
    this.pipelineStore = pipelineStore;
  }

  register(server: McpServer): void {
    server.tool(
      "sdr_get_pipeline",
      "セールスパイプラインの全体像を表示。ステージ別・ランク別のリード数、コンバージョン率を含む。",
      {},
      async () => {
        try {
          const metrics = this.pipelineStore.getPipeline();

          return createSuccessResponse({
            message: "パイプライン状況",
            metrics,
            visualization: formatPipelineVisualization(metrics),
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          return createErrorResponse(`パイプライン取得失敗: ${msg}`);
        }
      }
    );
  }
}

function formatPipelineVisualization(
  metrics: ReturnType<PipelineStore["getPipeline"]>
): string {
  const stages = [
    { key: "discovery", label: "Discovery" },
    { key: "qualification", label: "Qualification" },
    { key: "outreach", label: "Outreach" },
    { key: "follow_up", label: "Follow Up" },
    { key: "meeting", label: "Meeting" },
    { key: "closed_won", label: "Closed Won" },
    { key: "closed_lost", label: "Closed Lost" },
  ] as const;

  const lines = stages.map((stage) => {
    const count =
      metrics.byStage[stage.key as keyof typeof metrics.byStage] ?? 0;
    const bar = "|".repeat(Math.min(count, 50));
    return `${stage.label.padEnd(15)} ${bar} (${count})`;
  });

  return [
    "=== Pipeline Funnel ===",
    ...lines,
    "",
    `Total Leads: ${metrics.totalLeads}`,
    `Conversion Rate: ${Math.round(metrics.conversionRate * 100)}%`,
    `Followup Completion: ${Math.round(metrics.followupCompletionRate * 100)}%`,
  ].join("\n");
}

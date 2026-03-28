#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Storage
import { LeadStore } from "./storage/lead-store.js";
import { PipelineStore } from "./storage/pipeline-store.js";

// Outreach engine
import { SequenceEngine } from "./outreach/sequence-engine.js";

// Tools
import LeadImportTool from "./tools/lead-import.js";
import LeadSearchTool from "./tools/lead-search.js";
import LeadUpdateTool from "./tools/lead-update.js";
import LeadGetProfileTool from "./tools/lead-get-profile.js";
import ScoreLeadTool from "./tools/score-lead.js";
import ScoreBulkTool from "./tools/score-bulk.js";
import ComposeMessageTool from "./tools/compose-message.js";
import SendOutreachTool from "./tools/send-outreach.js";
import ScheduleFollowupTool from "./tools/schedule-followup.js";
import CreateSequenceTool from "./tools/create-sequence.js";
import GetSequenceStatusTool from "./tools/get-sequence-status.js";
import GetPipelineTool from "./tools/get-pipeline.js";
import UpdatePipelineStageTool from "./tools/update-pipeline-stage.js";
import GetAnalyticsTool from "./tools/get-analytics.js";

const server = new McpServer({
  name: "ai-sdr",
  version: "0.1.0",
});

// Initialize stores
const leadStore = new LeadStore();
const pipelineStore = new PipelineStore(leadStore);

// Initialize engines
const sequenceEngine = new SequenceEngine(pipelineStore);

// Register all 14 tools
const tools = [
  // Lead management (4)
  new LeadImportTool(leadStore),
  new LeadSearchTool(leadStore),
  new LeadUpdateTool(leadStore),
  new LeadGetProfileTool(leadStore, pipelineStore),

  // Scoring (2)
  new ScoreLeadTool(leadStore),
  new ScoreBulkTool(leadStore),

  // Outreach (3)
  new ComposeMessageTool(leadStore),
  new SendOutreachTool(leadStore, pipelineStore),
  new ScheduleFollowupTool(leadStore, pipelineStore),

  // Sequence (2)
  new CreateSequenceTool(leadStore, sequenceEngine),
  new GetSequenceStatusTool(pipelineStore, sequenceEngine),

  // Pipeline (2)
  new GetPipelineTool(pipelineStore),
  new UpdatePipelineStageTool(leadStore, pipelineStore),

  // Analytics (1)
  new GetAnalyticsTool(pipelineStore),
];

for (const tool of tools) {
  tool.register(server);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

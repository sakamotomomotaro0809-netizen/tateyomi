#!/usr/bin/env tsx
/**
 * AIT42 v2.0.0 - AutoPatch (KAMUI 5D Self-Learning Resilience)
 *
 * Purpose: Automatic bug fixing using Incident RAG
 *
 * Workflow:
 * 1. CI build fails → Capture error log
 * 2. Search Incident RAG for similar failures
 * 3. If similar incidents found → Generate patch from historical data
 * 4. Apply patch using refactor-specialist agent
 * 5. Re-run tests
 * 6. If successful → Record new incident with patch metadata
 */

import { ChromaClient } from 'chromadb';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = parseInt(process.env.CHROMA_PORT || '8000');
const SIMILARITY_THRESHOLD = parseFloat(process.env.AUTOPATCH_SIMILARITY_THRESHOLD || '0.75');
const MAX_RETRIES = parseInt(process.env.AUTOPATCH_MAX_RETRIES || '3');

interface IncidentDocument {
  id: string;
  text: string;
  metadata: {
    incident_type: string;
    timestamp: string;
    affected_agent: string;
    error_code?: string;
    root_cause?: string;
    applied_patch?: {
      patch_id: string;
      patch_type: string;
      files_modified: string[];
      diff: string;
      success: boolean;
    };
    resolution_time_ms?: number;
  };
}

interface PatchResult {
  success: boolean;
  patch?: {
    diff: string;
    files_modified: string[];
  };
  error?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Search Incident RAG for similar error logs
 */
async function searchIncidentRAG(errorLog: string, topK: number = 3): Promise<IncidentDocument[]> {
  try {
    const client = new ChromaClient({ path: `http://${CHROMA_HOST}:${CHROMA_PORT}` });
    const collection = await client.getCollection({ name: 'incident_rag' });

    const results = await collection.query({
      queryTexts: [errorLog],
      nResults: topK,
      where: {
        'applied_patch.success': true // Only fetch successfully resolved incidents
      }
    });

    const incidents: IncidentDocument[] = [];
    if (results.ids && results.ids[0] && results.metadatas && results.metadatas[0] && results.documents && results.documents[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        incidents.push({
          id: results.ids[0][i] as string,
          text: results.documents[0][i] as string,
          metadata: results.metadatas[0][i] as any
        });
      }
    }

    return incidents;
  } catch (error: any) {
    console.error('❌ Failed to search Incident RAG:', error.message);
    return [];
  }
}

/**
 * Generate patch from similar incidents
 */
async function generatePatch(
  currentError: string,
  similarIncidents: IncidentDocument[]
): Promise<PatchResult> {
  console.log('🧠 Analyzing similar incidents...\n');

  // Extract patterns from similar incidents
  const patchPatterns = similarIncidents
    .filter(incident => incident.metadata.applied_patch?.success)
    .map(incident => ({
      root_cause: incident.metadata.root_cause,
      patch_diff: incident.metadata.applied_patch?.diff,
      files_modified: incident.metadata.applied_patch?.files_modified || []
    }));

  if (patchPatterns.length === 0) {
    return {
      success: false,
      error: 'No successful patch patterns found in similar incidents'
    };
  }

  console.log('📊 Patch Patterns Found:');
  patchPatterns.forEach((pattern, idx) => {
    console.log(`   ${idx + 1}. Root Cause: ${pattern.root_cause}`);
    console.log(`      Files: ${pattern.files_modified.join(', ')}`);
  });
  console.log('');

  // TODO: Use LLM to synthesize patch from patterns
  // For now, return the most similar patch
  const bestPatch = patchPatterns[0];

  return {
    success: true,
    patch: {
      diff: bestPatch.patch_diff || '',
      files_modified: bestPatch.files_modified
    }
  };
}

/**
 * Apply patch using refactor-specialist agent
 */
async function applyPatch(patch: { diff: string; files_modified: string[] }): Promise<boolean> {
  console.log('🩹 Applying patch...\n');

  // TODO: Integrate with refactor-specialist agent via Claude Code Task tool
  // For now, simulate patch application

  console.log('📝 Files to modify:');
  patch.files_modified.forEach(file => console.log(`   - ${file}`));
  console.log('');
  console.log('📄 Patch diff:');
  console.log(patch.diff);
  console.log('');

  // Placeholder: Would call refactor-specialist here
  console.log('⚠️ NOTE: Actual patch application requires integration with refactor-specialist agent');

  return false; // Not yet implemented
}

/**
 * Record incident in RAG after successful patch
 */
async function recordIncident(
  errorLog: string,
  patch: { diff: string; files_modified: string[] },
  success: boolean
): Promise<void> {
  try {
    const client = new ChromaClient({ path: `http://${CHROMA_HOST}:${CHROMA_PORT}` });
    const collection = await client.getCollection({ name: 'incident_rag' });

    const incidentId = `${new Date().toISOString().split('T')[0]}-${Date.now()}-incident`;

    await collection.add({
      ids: [incidentId],
      documents: [errorLog],
      metadatas: [{
        incident_type: 'build_failure',
        timestamp: new Date().toISOString(),
        affected_agent: 'auto-patch',
        applied_patch: {
          patch_id: `patch-${incidentId}`,
          patch_type: 'code_change',
          files_modified: patch.files_modified,
          diff: patch.diff,
          success: success
        }
      }]
    });

    console.log(`✅ Incident recorded: ${incidentId}`);
  } catch (error: any) {
    console.error('❌ Failed to record incident:', error.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main AutoPatch Function
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function autoPatch(errorLog: string): Promise<boolean> {
  console.log('🔧 AIT42 AutoPatch - Automatic Bug Fixing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Step 1: Search for similar incidents
  console.log('🔍 Step 1: Searching Incident RAG for similar failures...\n');
  const similarIncidents = await searchIncidentRAG(errorLog, 3);

  if (similarIncidents.length === 0) {
    console.log('⚠️ No similar incidents found in RAG');
    console.log('💡 Manual intervention required');
    return false;
  }

  console.log(`✅ Found ${similarIncidents.length} similar incidents:\n`);
  similarIncidents.forEach((incident, idx) => {
    console.log(`   ${idx + 1}. ${incident.id}`);
    console.log(`      Error: ${incident.metadata.error_code}`);
    console.log(`      Root Cause: ${incident.metadata.root_cause || 'Unknown'}`);
    console.log(`      Resolution: ${incident.metadata.resolution_time_ms}ms`);
    console.log('');
  });

  // Step 2: Generate patch from historical data
  console.log('🧠 Step 2: Generating patch from historical data...\n');
  const patchResult = await generatePatch(errorLog, similarIncidents);

  if (!patchResult.success || !patchResult.patch) {
    console.log('❌ Failed to generate patch');
    return false;
  }

  // Step 3: Apply patch
  console.log('🩹 Step 3: Applying patch...\n');
  const patchApplied = await applyPatch(patchResult.patch);

  // Step 4: Record result
  if (patchApplied) {
    console.log('✅ Patch applied successfully!');
    await recordIncident(errorLog, patchResult.patch, true);
  } else {
    console.log('⚠️ Patch application pending (manual review required)');
  }

  return patchApplied;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (require.main === module) {
  const errorLogPath = process.argv[2];

  if (!errorLogPath) {
    console.error('Usage: npx tsx auto-patch.ts <error_log_file>');
    process.exit(1);
  }

  if (!fs.existsSync(errorLogPath)) {
    console.error(`Error log file not found: ${errorLogPath}`);
    process.exit(1);
  }

  const errorLog = fs.readFileSync(errorLogPath, 'utf-8');

  autoPatch(errorLog)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

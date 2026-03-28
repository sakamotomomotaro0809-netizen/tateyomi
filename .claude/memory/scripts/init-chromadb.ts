#!/usr/bin/env tsx
/**
 * AIT42 v2.0.0 - ChromaDB Initialization Script
 *
 * Purpose: Initialize ChromaDB for Incident RAG (KAMUI 5D AutoPatch)
 *
 * Collections:
 * 1. incident_rag - Failure-centric memory for AutoPatch
 * 2. task_embeddings - Task execution history with semantic search
 * 3. agent_knowledge - Agent-specific learned patterns
 */

import { ChromaClient } from 'chromadb';
import * as fs from 'fs';
import * as path from 'path';

const CHROMA_PATH = path.join(__dirname, '../chromadb');
const CHROMA_PORT = process.env.CHROMA_PORT || 8000;
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';

interface CollectionConfig {
  name: string;
  metadata: {
    description: string;
    'hnsw:space': string;
  };
}

const COLLECTIONS: CollectionConfig[] = [
  {
    name: 'incident_rag',
    metadata: {
      description: 'Failure-centric memory for AutoPatch - stores error logs, root causes, and applied patches',
      'hnsw:space': 'cosine'
    }
  },
  {
    name: 'task_embeddings',
    metadata: {
      description: 'Task execution history with semantic search - enables similarity-based agent selection',
      'hnsw:space': 'cosine'
    }
  },
  {
    name: 'agent_knowledge',
    metadata: {
      description: 'Agent-specific learned patterns - best practices, anti-patterns, optimization tips',
      'hnsw:space': 'cosine'
    }
  }
];

async function initChromaDB() {
  console.log('🚀 AIT42 v2.0.0 - ChromaDB Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Ensure ChromaDB directory exists
  if (!fs.existsSync(CHROMA_PATH)) {
    fs.mkdirSync(CHROMA_PATH, { recursive: true });
    console.log(`✅ Created ChromaDB directory: ${CHROMA_PATH}`);
  }

  try {
    // Connect to ChromaDB
    const client = new ChromaClient({
      path: `http://${CHROMA_HOST}:${CHROMA_PORT}`
    });

    console.log(`\n📡 Connecting to ChromaDB at ${CHROMA_HOST}:${CHROMA_PORT}...`);

    // Test connection
    const heartbeat = await client.heartbeat();
    console.log(`✅ ChromaDB heartbeat: ${heartbeat}ms`);

    // Create collections
    console.log('\n📚 Creating collections...\n');

    for (const config of COLLECTIONS) {
      try {
        const collection = await client.getOrCreateCollection({
          name: config.name,
          metadata: config.metadata
        });

        const count = await collection.count();
        console.log(`✅ ${config.name}`);
        console.log(`   Description: ${config.metadata.description}`);
        console.log(`   Documents: ${count}`);
        console.log(`   Distance: ${config.metadata['hnsw:space']}`);
        console.log('');
      } catch (error: any) {
        console.error(`❌ Failed to create ${config.name}:`, error.message);
      }
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ChromaDB initialization complete!');
    console.log('');
    console.log('📊 Collections Summary:');
    console.log(`   - incident_rag: Stores failure cases for AutoPatch`);
    console.log(`   - task_embeddings: Semantic task history search`);
    console.log(`   - agent_knowledge: Agent-specific patterns`);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Start ChromaDB server: docker-compose up chromadb');
    console.log('   2. Test AutoPatch: npx tsx .claude/self-heal/auto-patch.ts');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ ChromaDB initialization failed!');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Ensure ChromaDB server is running:');
    console.error('      docker-compose up chromadb');
    console.error('   2. Check CHROMA_HOST and CHROMA_PORT env vars');
    console.error('   3. Verify network connectivity to ChromaDB');
    console.error('');
    process.exit(1);
  }
}

// Execute
initChromaDB().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

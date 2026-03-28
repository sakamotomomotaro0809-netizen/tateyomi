import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { Lead, LeadRank, PipelineStage } from "../types.js";

const DEFAULT_STORAGE_DIR = "output/sdr";
const LEADS_FILE = "leads.json";

export interface LeadSearchFilters {
  readonly name?: string;
  readonly email?: string;
  readonly company?: string;
  readonly industry?: string;
  readonly companySize?: string;
  readonly region?: string;
  readonly rank?: LeadRank;
  readonly pipelineStage?: PipelineStage;
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly minScore?: number;
  readonly maxScore?: number;
}

export interface LeadImportRow {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly lineUserId?: string;
  readonly company: string;
  readonly position: string;
  readonly industry: string;
  readonly companySize?: "small" | "medium" | "large" | "enterprise";
  readonly region: string;
  readonly source?: string;
  readonly tags?: string;
}

export class LeadStore {
  private readonly storagePath: string;
  private leads: Lead[] = [];

  constructor(storageDir?: string) {
    const dir = storageDir ?? DEFAULT_STORAGE_DIR;
    this.storagePath = path.resolve(dir, LEADS_FILE);
    this.ensureDirectoryExists(dir);
    this.loadFromDisk();
  }

  private ensureDirectoryExists(dir: string): void {
    const resolvedDir = path.resolve(dir);
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        this.leads = JSON.parse(raw) as Lead[];
      }
    } catch {
      this.leads = [];
    }
  }

  private saveToDisk(): void {
    fs.writeFileSync(this.storagePath, JSON.stringify(this.leads, null, 2), "utf-8");
  }

  importLeads(rows: readonly LeadImportRow[]): readonly Lead[] {
    const now = new Date().toISOString();
    const imported: Lead[] = rows.map((row) => ({
      id: uuidv4(),
      name: row.name,
      email: row.email,
      phone: row.phone,
      lineUserId: row.lineUserId,
      company: row.company,
      position: row.position,
      industry: row.industry,
      companySize: row.companySize ?? "small",
      region: row.region,
      source: row.source ?? "manual_import",
      score: 0,
      rank: "COLD" as LeadRank,
      pipelineStage: "discovery" as PipelineStage,
      tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
      customFields: {},
      createdAt: now,
      updatedAt: now,
    }));

    this.leads = [...this.leads, ...imported];
    this.saveToDisk();
    return imported;
  }

  searchLeads(filters: LeadSearchFilters): readonly Lead[] {
    return this.leads.filter((lead) => {
      if (filters.name && !lead.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      if (filters.email && !lead.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      if (filters.company && !lead.company.toLowerCase().includes(filters.company.toLowerCase())) {
        return false;
      }
      if (filters.industry && !lead.industry.toLowerCase().includes(filters.industry.toLowerCase())) {
        return false;
      }
      if (filters.companySize && lead.companySize !== filters.companySize) {
        return false;
      }
      if (filters.region && !lead.region.includes(filters.region)) {
        return false;
      }
      if (filters.rank && lead.rank !== filters.rank) {
        return false;
      }
      if (filters.pipelineStage && lead.pipelineStage !== filters.pipelineStage) {
        return false;
      }
      if (filters.source && lead.source !== filters.source) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every((tag) => lead.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      if (filters.minScore !== undefined && lead.score < filters.minScore) {
        return false;
      }
      if (filters.maxScore !== undefined && lead.score > filters.maxScore) {
        return false;
      }
      return true;
    });
  }

  getLeadById(id: string): Lead | null {
    return this.leads.find((lead) => lead.id === id) ?? null;
  }

  updateLead(id: string, data: Partial<Omit<Lead, "id" | "createdAt">>): Lead {
    const index = this.leads.findIndex((lead) => lead.id === id);
    if (index === -1) {
      throw new Error(`Lead not found: ${id}`);
    }

    const existing = this.leads[index];
    const updated: Lead = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.leads = [
      ...this.leads.slice(0, index),
      updated,
      ...this.leads.slice(index + 1),
    ];
    this.saveToDisk();
    return updated;
  }

  getAllLeads(): readonly Lead[] {
    return [...this.leads];
  }

  getLeadCount(): number {
    return this.leads.length;
  }
}

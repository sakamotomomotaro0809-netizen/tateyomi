import { v4 as uuidv4 } from "uuid";
import type { Lead, Sequence, SequenceStatus, SequenceStep } from "../types.js";
import type { PipelineStore } from "../storage/pipeline-store.js";

export class SequenceEngine {
  private readonly pipelineStore: PipelineStore;

  constructor(pipelineStore: PipelineStore) {
    this.pipelineStore = pipelineStore;
  }

  createSequence(
    lead: Lead,
    steps: readonly SequenceStep[],
    name?: string
  ): Sequence {
    const now = new Date().toISOString();
    const sequence: Sequence = {
      id: uuidv4(),
      name: name ?? `Sequence for ${lead.name}`,
      leadId: lead.id,
      steps,
      currentStep: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    this.pipelineStore.addSequence(sequence);
    return sequence;
  }

  advanceSequence(sequenceId: string): Sequence {
    const sequence = this.pipelineStore.getSequenceById(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceId}`);
    }

    if (sequence.status !== "active") {
      throw new Error(
        `Cannot advance sequence in status: ${sequence.status}`
      );
    }

    const currentStepIndex = sequence.currentStep;
    if (currentStepIndex >= sequence.steps.length) {
      const completed: Sequence = {
        ...sequence,
        status: "completed" as SequenceStatus,
        updatedAt: new Date().toISOString(),
      };
      this.pipelineStore.updateSequence(sequenceId, completed);
      return completed;
    }

    const updatedSteps = sequence.steps.map((step, index) => {
      if (index === currentStepIndex) {
        return {
          ...step,
          status: "sent" as const,
          executedAt: new Date().toISOString(),
        };
      }
      return step;
    });

    const nextStep = currentStepIndex + 1;
    const isCompleted = nextStep >= sequence.steps.length;

    const updated: Sequence = {
      ...sequence,
      steps: updatedSteps,
      currentStep: nextStep,
      status: isCompleted ? "completed" : "active",
      updatedAt: new Date().toISOString(),
    };

    this.pipelineStore.updateSequence(sequenceId, updated);
    return updated;
  }

  getNextStep(sequence: Sequence): SequenceStep | null {
    if (sequence.status !== "active") {
      return null;
    }

    if (sequence.currentStep >= sequence.steps.length) {
      return null;
    }

    return sequence.steps[sequence.currentStep] ?? null;
  }

  pauseSequence(sequenceId: string): Sequence {
    const sequence = this.pipelineStore.getSequenceById(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceId}`);
    }

    const updated: Sequence = {
      ...sequence,
      status: "paused",
      updatedAt: new Date().toISOString(),
    };

    this.pipelineStore.updateSequence(sequenceId, updated);
    return updated;
  }

  resumeSequence(sequenceId: string): Sequence {
    const sequence = this.pipelineStore.getSequenceById(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceId}`);
    }

    if (sequence.status !== "paused") {
      throw new Error(`Cannot resume sequence in status: ${sequence.status}`);
    }

    const updated: Sequence = {
      ...sequence,
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    this.pipelineStore.updateSequence(sequenceId, updated);
    return updated;
  }

  cancelSequence(sequenceId: string): Sequence {
    const sequence = this.pipelineStore.getSequenceById(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceId}`);
    }

    const updatedSteps = sequence.steps.map((step) => {
      if (step.status === "pending") {
        return { ...step, status: "skipped" as const };
      }
      return step;
    });

    const updated: Sequence = {
      ...sequence,
      steps: updatedSteps,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    this.pipelineStore.updateSequence(sequenceId, updated);
    return updated;
  }
}

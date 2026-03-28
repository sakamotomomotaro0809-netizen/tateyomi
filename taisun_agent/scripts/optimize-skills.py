#!/usr/bin/env python3
"""
Context Optimization T1.1 + T1.2: Skill description optimization + disable-model-invocation
REQ-001: All descriptions English ≤50 chars
REQ-002: Low-frequency skills get disable-model-invocation: true
"""

import os
import re
import sys

SKILLS_DIR = os.path.join(os.path.dirname(__file__), '..', '.claude', 'skills')

# T1.1: Optimized English descriptions (≤50 chars each)
DESCRIPTION_MAP = {
    "agent-trace": "AI code attribution tracking",
    "agentic-vision": "Image/video analysis with Gemini",
    "ai-manga-generator": "AI manga/comic page generator",
    "ai-sdr": "Autonomous AI sales pipeline",
    "anime-production": "Anime video and ad production",
    "anime-slide-generator": "Anime-style slide generator",
    "apify-research": "Web scraping research via Apify",
    "context7-docs": "Fetch latest framework/library docs",
    "copywriting-helper": "Sales copy and marketing writing",
    "custom-character": "Consistent character art creation",
    "customer-support-120": "120% customer support responses",
    "diagram-illustration": "Diagram and infographic creation",
    "doc-convert-pandoc": "Document format conversion",
    "docker-mcp-ops": "Docker container ops via MCP",
    "dr-build": "Deep research build phase",
    "dr-explore": "Deep research exploration phase",
    "dr-mcp-setup": "Deep research MCP setup",
    "dr-synthesize": "Deep research synthesis phase",
    "dual-ai-review": "Dual AI code review system",
    "education-framework": "6-element education content design",
    "figma-design": "Convert Figma designs to code",
    "funnel-builder": "Marketing funnel builder",
    "gem-research": "9-layer research for Marketing AI",
    "gpt-researcher": "Deep research with source validation",
    "gpt-sovits-tts": "Voice cloning TTS with GPT-SoVITS",
    "hierarchical-memory": "Multi-layer memory management",
    "japanese-tts-reading": "Japanese text-to-speech conversion",
    "keyword-free": "API-free keyword extraction",
    "keyword-mega-extractor": "SEO keyword extraction and analysis",
    "keyword-to-gem": "Auto Gem creation from keywords",
    "kindle-publishing": "Kindle book writing and publishing",
    "launch-video": "Product launch video scripts",
    "lead-scoring": "4D lead scoring and qualification",
    "line-marketing": "LINE marketing automation",
    "lp-analysis": "LP conversion optimization analysis",
    "lp-analytics": "LP knowledge base analytics",
    "lp-design": "Landing page design and structure",
    "lp-full-generation": "Full LP generation with local LLM",
    "lp-json-generator": "LP image generation with text swap",
    "lp-local-generator": "Local LLM LP section generator",
    "mega-research": "6-API integrated research system",
    "mega-research-plus": "8-source integrated research system",
    "mendan-lp": "High-conversion consultation LP",
    "nanobanana-pro": "AI image generation via Gemini",
    "nanobanana-prompts": "Gemini image generation prompts",
    "note-marketing": "note article marketing strategy",
    "note-research": "note.com research tool",
    "notion-knowledge-mcp": "Notion knowledge search via MCP",
    "omnihuman1-video": "AI avatar lip-sync video creation",
    "opencode-fix": "OpenCode bug fix workflow",
    "opencode-ralph-loop": "OpenCode iterative dev support",
    "opencode-setup": "OpenCode/OMO setup guide",
    "outreach-composer": "Multi-channel outreach messages",
    "pdf-automation-gotenberg": "PDF conversion via Gotenberg",
    "pdf-processing": "PDF reading and text extraction",
    "phase1-tools": "Document processing tool suite",
    "phase2-monitoring": "Observability stack setup",
    "postgres-mcp-analyst": "PostgreSQL analysis via MCP",
    "qdrant-memory": "Vector search and long-term memory",
    "research": "Deep research with report generation",
    "research-cited-report": "Cited research report generation",
    "research-free": "API-free integrated research",
    "sales-systems": "VSL/seminar/consultation systems",
    "sdd-full": "Full SDD pipeline: req to runbook",
    "sdd-full-pipeline": "Full SDD pipeline with scoring",
    "sdd-req100": "EARS requirements with scoring",
    "sdd-design": "Generate C4 design documents",
    "sdd-tasks": "Generate Kiro-format task plans",
    "sdd-threat": "Generate STRIDE threat models",
    "sdd-slo": "Generate SLO/SLI/SLA definitions",
    "sdd-adr": "Generate Architecture Decision Records",
    "sdd-runbook": "Generate incident response runbook",
    "sdd-guardrails": "Generate AI agent guardrails",
    "security-scan-trivy": "Vulnerability scan with Trivy",
    "shorts-create": "Auto-generate Shorts/Reels videos",
    "skill-validator": "Validate skill file structure",
    "sns-marketing": "SNS marketing operations",
    "sns-patterns": "SNS posting patterns and strategy",
    "taiyo-analyzer": "Taiyo-style content scoring engine",
    "taiyo-rewriter": "Rewrite content in Taiyo style",
    "taiyo-style": "Taiyo copywriting style application",
    "taiyo-style-bullet": "Taiyo-style bullet/benefit lists",
    "taiyo-style-headline": "Taiyo-style headline generation",
    "taiyo-style-lp": "Taiyo-style LP creation",
    "taiyo-style-ps": "Taiyo-style P.S. generation",
    "taiyo-style-sales-letter": "Taiyo-style sales letter creation",
    "taiyo-style-step-mail": "Taiyo-style step mail creation",
    "taiyo-style-vsl": "Taiyo-style VSL script creation",
    "telop": "Video caption/telop creation",
    "udemy-download": "Download Udemy courses with auth",
    "unified-notifications-apprise": "Unified notifications via Apprise",
    "unified-research": "Multi-API unified research",
    "url-all": "Full URL analysis and extraction",
    "url-deep-analysis": "Deep URL structure analysis",
    "video-agent": "Video production pipeline",
    "voice-ai": "Voice AI phone call orchestration",
    "workflow-automation-n8n": "n8n workflow automation design",
    "world-research": "Global SNS/academic cross-search",
    "youtube-content": "YouTube video planning and scripts",
    "youtube-thumbnail": "YouTube thumbnail creation guide",
    "youtube_channel_summary": "YouTube channel analysis",
}

# T1.2: High-frequency skills that should NOT have disable-model-invocation
HIGH_FREQUENCY_SKILLS = {
    "taiyo-style",
    "taiyo-analyzer",
    "taiyo-style-lp",
    "taiyo-style-vsl",
    "taiyo-style-sales-letter",
    "taiyo-style-step-mail",
    "taiyo-style-headline",
    "taiyo-style-bullet",
    "taiyo-style-ps",
    "taiyo-rewriter",
    "research",
    "research-free",
    "mega-research",
    "mega-research-plus",
    "keyword-free",
    "keyword-mega-extractor",
    "url-all",
    "url-deep-analysis",
    "agentic-vision",
    "nanobanana-pro",
    "context7-docs",
    "video-agent",
    "shorts-create",
    "sdd-full",
    "sdd-full-pipeline",
    "copywriting-helper",
    "education-framework",
}


def process_skill(skill_dir, skill_name, dry_run=False):
    """Process a single skill's SKILL.md file."""
    skill_md = os.path.join(skill_dir, 'SKILL.md')
    if not os.path.exists(skill_md):
        return None

    with open(skill_md, 'r', encoding='utf-8') as f:
        content = f.read()

    if not content.startswith('---'):
        return None

    # Find end of frontmatter
    second_dash = content.find('---', 3)
    if second_dash == -1:
        return None

    frontmatter = content[3:second_dash]
    body = content[second_dash:]

    changes = []

    # T1.1: Update description
    new_desc = DESCRIPTION_MAP.get(skill_name)
    if new_desc:
        # Handle multi-line description (YAML block scalar |)
        if re.search(r'^description:\s*\|', frontmatter, re.MULTILINE):
            # Replace multi-line description
            frontmatter = re.sub(
                r'^description:\s*\|[^\n]*\n(?:\s{2,}[^\n]*\n?)*',
                f'description: {new_desc}\n',
                frontmatter,
                flags=re.MULTILINE
            )
            changes.append(f"desc: multiline -> '{new_desc}' ({len(new_desc)} chars)")
        elif re.search(r'^description:\s*["\']?', frontmatter, re.MULTILINE):
            # Replace single-line description
            frontmatter = re.sub(
                r'^description:.*$',
                f'description: {new_desc}',
                frontmatter,
                flags=re.MULTILINE
            )
            changes.append(f"desc: -> '{new_desc}' ({len(new_desc)} chars)")

    # T1.2: Add disable-model-invocation for low-frequency skills
    should_disable = skill_name not in HIGH_FREQUENCY_SKILLS
    has_disable = 'disable-model-invocation' in frontmatter

    if should_disable and not has_disable:
        # Add before the closing ---
        frontmatter = frontmatter.rstrip('\n') + '\ndisable-model-invocation: true\n'
        changes.append("added disable-model-invocation: true")
    elif not should_disable and has_disable:
        # Remove disable-model-invocation for high-frequency skills
        frontmatter = re.sub(
            r'^disable-model-invocation:.*\n?',
            '',
            frontmatter,
            flags=re.MULTILINE
        )
        changes.append("removed disable-model-invocation (high-frequency)")

    if not changes:
        return None

    if not dry_run:
        new_content = '---' + frontmatter + body
        with open(skill_md, 'w', encoding='utf-8') as f:
            f.write(new_content)

    return changes


def main():
    dry_run = '--dry-run' in sys.argv
    skills_dir = os.path.abspath(SKILLS_DIR)

    if not os.path.isdir(skills_dir):
        print(f"Skills directory not found: {skills_dir}")
        sys.exit(1)

    print(f"{'[DRY RUN] ' if dry_run else ''}Processing skills in: {skills_dir}")
    print("=" * 60)

    total = 0
    modified = 0
    desc_updated = 0
    disable_added = 0
    errors = []

    for entry in sorted(os.listdir(skills_dir)):
        skill_path = os.path.join(skills_dir, entry)
        if not os.path.isdir(skill_path):
            continue
        if entry.startswith('_') or entry.startswith('.'):
            continue

        total += 1
        try:
            changes = process_skill(skill_path, entry, dry_run)
            if changes:
                modified += 1
                for c in changes:
                    if 'desc:' in c:
                        desc_updated += 1
                    if 'disable-model-invocation' in c and 'added' in c:
                        disable_added += 1
                print(f"  {entry}: {', '.join(changes)}")
        except Exception as e:
            errors.append(f"{entry}: {e}")
            print(f"  {entry}: ERROR - {e}")

    print("=" * 60)
    print(f"Total skills:      {total}")
    print(f"Modified:          {modified}")
    print(f"Desc updated:      {desc_updated}")
    print(f"Disable added:     {disable_added}")
    print(f"Errors:            {len(errors)}")
    if dry_run:
        print("\n[DRY RUN] No files were modified. Run without --dry-run to apply.")


if __name__ == '__main__':
    main()

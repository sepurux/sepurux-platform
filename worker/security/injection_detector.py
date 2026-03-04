from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True)
class InjectionDetectionResult:
    risk_score: float
    matches: list[str]


@dataclass(frozen=True)
class _Rule:
    pattern_id: str
    regex: re.Pattern[str]
    weight: float
    sanitize: bool


_RULES: Final[tuple[_Rule, ...]] = (
    _Rule(
        pattern_id="ignore_previous_instructions",
        regex=re.compile(r"\bignore\s+(all\s+)?previous\s+instructions\b", re.IGNORECASE),
        weight=0.75,
        sanitize=True,
    ),
    _Rule(
        pattern_id="disregard_previous_instructions",
        regex=re.compile(r"\bdisregard\s+(all\s+)?previous\s+instructions\b", re.IGNORECASE),
        weight=0.7,
        sanitize=True,
    ),
    _Rule(
        pattern_id="system_prompt_reference",
        regex=re.compile(r"\bsystem\s+prompt\b", re.IGNORECASE),
        weight=0.55,
        sanitize=True,
    ),
    _Rule(
        pattern_id="developer_message_reference",
        regex=re.compile(r"\bdeveloper\s+message\b", re.IGNORECASE),
        weight=0.5,
        sanitize=True,
    ),
    _Rule(
        pattern_id="you_are_chatgpt",
        regex=re.compile(r"\byou\s+are\s+chatgpt\b", re.IGNORECASE),
        weight=0.6,
        sanitize=True,
    ),
    _Rule(
        pattern_id="tool_execution_instruction",
        regex=re.compile(
            r"\b(call\s+function|invoke\s+tool|execute\s+tool|tool\s+call)\b",
            re.IGNORECASE,
        ),
        weight=0.45,
        sanitize=False,
    ),
    _Rule(
        pattern_id="reveal_sensitive_data",
        regex=re.compile(
            r"\b(reveal|exfiltrate|leak)\b.{0,30}\b(password|token|secret|api[_\s-]?key)\b",
            re.IGNORECASE,
        ),
        weight=0.55,
        sanitize=True,
    ),
    _Rule(
        pattern_id="credential_keywords",
        regex=re.compile(r"\b(password|token|secret|api[_\s-]?key)\b", re.IGNORECASE),
        weight=0.3,
        sanitize=False,
    ),
    _Rule(
        pattern_id="guardrail_bypass",
        regex=re.compile(
            r"\b(bypass|override|disable)\b.{0,25}\b(safety|guardrail|policy|rules?)\b",
            re.IGNORECASE,
        ),
        weight=0.45,
        sanitize=True,
    ),
)

_HIGH_RISK_RULE_IDS: Final[frozenset[str]] = frozenset(
    rule.pattern_id for rule in _RULES if rule.sanitize
)


def detect_prompt_injection(text: str) -> InjectionDetectionResult:
    content = text if isinstance(text, str) else ""
    if not content.strip():
        return InjectionDetectionResult(risk_score=0.0, matches=[])

    score = 0.0
    matches: list[str] = []
    for rule in _RULES:
        if rule.regex.search(content):
            matches.append(rule.pattern_id)
            score += rule.weight

    if len(matches) >= 3:
        score += 0.1

    return InjectionDetectionResult(risk_score=min(1.0, round(score, 4)), matches=matches)


def sanitize_untrusted_text(text: str) -> str:
    content = text if isinstance(text, str) else ""
    if not content:
        return "[UNTRUSTED CONTENT]"

    kept_lines: list[str] = []
    removed_any = False
    for line in content.splitlines():
        if _line_matches_high_risk_pattern(line):
            removed_any = True
            continue
        kept_lines.append(line)

    if removed_any:
        body = "\n".join(kept_lines).strip()
        if not body:
            body = "[content removed by sanitizer]"
        return f"[UNTRUSTED CONTENT]\n{body}"

    return f"[UNTRUSTED CONTENT] {content}"


def _line_matches_high_risk_pattern(line: str) -> bool:
    for rule in _RULES:
        if rule.pattern_id not in _HIGH_RISK_RULE_IDS:
            continue
        if rule.regex.search(line):
            return True
    return False

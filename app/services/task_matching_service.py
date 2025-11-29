"""Task matching service for parsing and matching task descriptions."""

import re
from typing import Optional
from app.models.jira import JiraIssue
from app.models.excel import ParsedTaskLine
from app.core.logging import get_logger

logger = get_logger(__name__)


class TaskMatchingService:
    """Service for parsing task descriptions and matching to JIRA issues."""
    
    # Verb mappings
    VERB_MAPPING = {
        'author': 'Authoring',
        'rework': 'Authoring',
        'review': 'Review'
    }
    
    def parse_task_line(self, line: str) -> ParsedTaskLine:
        """
        Parse a task description line.
        
        Args:
            line: Task description (e.g., "Author TC ABC123")
            
        Returns:
            ParsedTaskLine object with parsed components
        """
        original_line = line
        line = line.strip('-').strip()
        lowered = line.lower()
        
        # Extract verb (author, review, rework)
        verb_match = re.search(r'\b(author|review|rework)\b', lowered)
        verb = None
        summary_verb = None
        
        if verb_match:
            verb = verb_match.group(1).capitalize()
            summary_verb = self.VERB_MAPPING.get(verb.lower())
        
        # Extract type and base name
        # Pattern: verb [number] [TC/TP/TCs/TPs or TC/TP] base_name
        match = re.search(
            r'\b(?:author|review|rework)[^a-zA-Z0-9]*\d*\s*(tcs?/tps?|tps?/tcs?|tcs?|tps?)?\s*([a-zA-Z0-9_]+)\s*$',
            lowered,
            re.IGNORECASE
        )
        
        base_name = None
        task_types = []
        
        if match:
            type_indicator = match.group(1)
            base_name = match.group(2)
            
            # Determine task types
            if type_indicator:
                if 'tc' in type_indicator.lower() and 'tp' in type_indicator.lower():
                    task_types = ['TC', 'TP']
                elif 'tc' in type_indicator.lower():
                    task_types = ['TC']
                elif 'tp' in type_indicator.lower():
                    task_types = ['TP']
        
        return ParsedTaskLine(
            original_line=original_line,
            verb=summary_verb,
            task_type=','.join(task_types) if task_types else None,
            base_name=base_name
        )
    
    def match_tasks(self, parsed_lines: list[ParsedTaskLine], jira_issues: list[JiraIssue]) -> list[str]:
        """
        Match parsed task lines to JIRA issues.
        
        Args:
            parsed_lines: List of parsed task lines
            jira_issues: List of JIRA issues to match against
            
        Returns:
            List of matched JIRA issue keys
        """
        matched_keys = set()
        
        # Create summary lookup
        summary_to_key = {issue.summary: issue.key for issue in jira_issues}
        
        for parsed in parsed_lines:
            # Skip if not properly parsed
            if not parsed.verb or not parsed.base_name:
                # Try fallback: direct substring match
                for summary, key in summary_to_key.items():
                    if parsed.original_line.lower() in summary.lower():
                        matched_keys.add(key)
                        logger.info(f"Matched '{parsed.original_line}' to {key} (fallback)")
                continue
            
            # Parse task types
            types_to_check = parsed.task_type.split(',') if parsed.task_type else [None]
            
            # Match against summaries
            for summary, key in summary_to_key.items():
                normalized_summary = re.sub(r'\s+', ' ', summary)
                
                # Check verb match
                if parsed.verb not in normalized_summary:
                    continue
                
                # Check base name match
                if parsed.base_name.lower() not in normalized_summary.lower():
                    continue
                
                # Check task type match
                if types_to_check == [None]:
                    # No type specified, just match verb and base
                    matched_keys.add(key)
                    logger.info(f"Matched '{parsed.original_line}' to {key}")
                else:
                    # Check if any of the types match
                    for task_type in types_to_check:
                        if re.search(r'\b' + re.escape(task_type) + r'\b', normalized_summary):
                            matched_keys.add(key)
                            logger.info(f"Matched '{parsed.original_line}' to {key} (type: {task_type})")
        
        return list(matched_keys)
    
    def parse_and_match(self, text: str, jira_issues: list[JiraIssue]) -> list[str]:
        """
        Parse text containing multiple task lines and match to JIRA issues.
        
        Args:
            text: Multi-line text with task descriptions
            jira_issues: List of JIRA issues to match against
            
        Returns:
            List of matched JIRA issue keys
        """
        lines = [line.strip('-').strip() for line in text.splitlines() if line.strip()]
        parsed_lines = [self.parse_task_line(line) for line in lines]
        return self.match_tasks(parsed_lines, jira_issues)

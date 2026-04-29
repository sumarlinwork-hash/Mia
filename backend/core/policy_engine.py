import json
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class PolicyAction(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    OBSERVE = "observe"

class PolicyOperator(str, Enum):
    EQ = "=="
    NEQ = "!="
    GT = ">"
    LT = "<"
    IN = "IN"
    NOT_IN = "NOT_IN"

class PolicyCondition(BaseModel):
    field: str
    operator: PolicyOperator
    value: Any

class PolicyRule(BaseModel):
    id: str
    action: PolicyAction
    tool_pattern: str # Regex for tool names, e.g. "terminal.*"
    conditions: List[PolicyCondition] = Field(default_factory=list)
    priority: int = 0
    description: str = ""

class PolicyDecision(BaseModel):
    allowed: bool
    action: PolicyAction
    reason_trace: List[str] = Field(default_factory=list)
    rule_path: List[str] = Field(default_factory=list)

class PolicyEngine:
    def __init__(self):
        self.rules: List[PolicyRule] = []
        self.version = "1.0.0"

    def load_policies(self, policies_json: str):
        data = json.loads(policies_json)
        self.rules = [PolicyRule(**r) for r in data]
        # Sort by priority (higher first)
        self.rules.sort(key=lambda x: x.priority, reverse=True)

    def evaluate_node(self, node_id: str, tool: str, args: Dict[str, Any], context: Dict[str, Any] = None) -> PolicyDecision:
        """
        Deterministic AST-based evaluation of a single node.
        """
        trace = []
        rule_path = []
        context = context or {}
        
        # Combine args and context for field lookup
        eval_context = {**args, **context}
        
        for rule in self.rules:
            if re.match(rule.tool_pattern, tool):
                # Check conditions
                match = True
                for cond in rule.conditions:
                    if not self._evaluate_condition(cond, eval_context):
                        match = False
                        break
                
                if match:
                    rule_path.append(rule.id)
                    if rule.action == PolicyAction.DENY:
                        return PolicyDecision(
                            allowed=False, 
                            action=PolicyAction.DENY, 
                            reason_trace=[f"Matched DENY rule: {rule.id}"],
                            rule_path=rule_path
                        )
                    if rule.action == PolicyAction.ALLOW:
                        return PolicyDecision(
                            allowed=True, 
                            action=PolicyAction.ALLOW, 
                            reason_trace=[f"Matched ALLOW rule: {rule.id}"],
                            rule_path=rule_path
                        )
        
        # Default behavior: Deny if no rule matched (Strict Mode)
        return PolicyDecision(
            allowed=False, 
            action=PolicyAction.DENY, 
            reason_trace=["No matching policy rule found. Defaulting to strict DENY."],
            rule_path=["default_deny"]
        )

    def _evaluate_condition(self, cond: PolicyCondition, context: Dict[str, Any]) -> bool:
        # Canonical evaluation order (Rule 3.1)
        val = context.get(cond.field)
        
        if cond.operator == PolicyOperator.EQ:
            return val == cond.value
        if cond.operator == PolicyOperator.NEQ:
            return val != cond.value
        if cond.operator == PolicyOperator.GT:
            return val > cond.value
        if cond.operator == PolicyOperator.LT:
            return val < cond.value
        if cond.operator == PolicyOperator.IN:
            return val in cond.value
        if cond.operator == PolicyOperator.NOT_IN:
            return val not in cond.value
            
        return False

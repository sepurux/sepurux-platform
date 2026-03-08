package sepurux.policy

allow_payments_refund := false

default decision := {
  "decision": "allow",
  "reason": "allowed by default policy",
}

decision := {
  "decision": "require_approval",
  "reason": "payments.refund requires explicit approval token",
} if {
  input.tool.name == "payments.refund"
  not allow_payments_refund
}

decision := {
  "decision": "require_approval",
  "reason": "jira.create_issue commit-like action requires explicit approval token",
} if {
  jira_commit_like
}

jira_commit_like if {
  input.tool.name == "jira.create_issue(commit)"
}

jira_commit_like if {
  input.tool.name == "jira.create_issue_commit"
}

jira_commit_like if {
  input.tool.name == "jira.create_issue"
  object.get(input.tool.args, "commit", false) == true
}

jira_commit_like if {
  input.tool.name == "jira.create_issue"
  lower(object.get(input.tool.args, "mode", "")) == "commit"
}

jira_commit_like if {
  input.tool.name == "jira.create_issue"
  lower(object.get(input.tool.args, "action", "")) == "commit"
}

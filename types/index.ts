export interface Organisation {
  id: string;
  name: string;
  email_domain: string;
  plan: 'trial' | 'pro' | 'enterprise';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  org_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  type: 'greenfield' | 'brownfield';
  cloud_provider: 'aws' | 'azure' | 'gcp' | 'multi';
  status: 'draft' | 'in_progress' | 'complete';
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface Blueprint {
  id: string;
  project_id: string;
  user_id: string;
  prompt: string;
  arch_plan: ArchPlan | null;
  terraform_code: string | null;
  audit_result: 'PASSED' | 'REJECTED' | null;
  security_findings: SecurityFinding[];
  cost_estimate: CostEstimate | null;
  dr_config: DRConfig | null;
  created_at: string;
}

export interface ArchPlan {
  provider: string;
  region: string;
  resources: Array<{
    type: string;
    purpose: string;
  }>;
}

export interface SecurityFinding {
  component: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  risk: string;
  resolution: string;
}

export interface CostEstimate {
  provider: string;
  monthly_usd: number;
  breakdown: Array<{
    item: string;
    cost: number;
  }>;
  alternatives: Array<{
    provider: string;
    monthly_usd: number;
    note: string;
  }>;
}

export interface DRConfig {
  strategy: 'backup_restore' | 'pilot_light' | 'warm_standby' | 'active_active';
  rto_minutes: number;
  rpo_minutes: number;
  secondary_region: string;
}

// Pipeline types
export type AgentName = 'gatekeeper' | 'architect' | 'engineer' | 'auditor';

export type PipelineStatus = 'idle' | 'running' | 'passed' | 'failed';

export interface PipelineEvent {
  agent: AgentName;
  status: 'started' | 'completed' | 'rejected' | 'error';
  message: string;
  payload?: unknown;
  timestamp: string;
}

// Auth types
export interface AuthRequest {
  email: string;
  password: string;
  full_name?: string;
  org_name?: string;
}

export interface JWTPayload {
  sub: string;       // user id
  email: string;
  org_id: string;
  role: string;
  iat: number;
  exp: number;
}
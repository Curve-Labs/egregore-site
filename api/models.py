from pydantic import BaseModel, Field
from typing import Optional


class GraphQuery(BaseModel):
    statement: str = Field(..., max_length=10240)
    parameters: dict = {}


class GraphBatch(BaseModel):
    queries: list[GraphQuery] = Field(..., min_length=1, max_length=20)


class NotifySend(BaseModel):
    to: str
    message: str


class NotifyGroup(BaseModel):
    message: str


class OrgRegister(BaseModel):
    org_name: str
    github_org: str
    telegram_chat_id: Optional[str] = None


# --- Setup flow models ---


class OrgSetup(BaseModel):
    """Founder: full org setup request."""
    github_org: str
    org_name: str
    is_personal: bool = False
    telegram_chat_id: Optional[str] = None
    repos: list[str] = []
    instance_name: Optional[str] = None


class OrgJoin(BaseModel):
    """Joiner: join an existing org."""
    github_org: str
    repo_name: str = "egregore-core"


class OrgTelegram(BaseModel):
    """Bot reports its chat_id after being added to a group."""
    org_slug: str
    chat_id: str
    group_title: Optional[str] = None
    group_username: Optional[str] = None


class GitHubCallback(BaseModel):
    """Exchange OAuth code for token."""
    code: str


class OrgInfo(BaseModel):
    """Org detection result for a single org."""
    login: str
    name: str
    has_egregore: bool
    role: str
    avatar_url: str = ""


class PersonalInfo(BaseModel):
    login: str
    has_egregore: bool


class UserInfo(BaseModel):
    login: str
    name: str
    avatar_url: str = ""


class SetupOrgsResponse(BaseModel):
    """Response for GET /api/org/setup/orgs."""
    user: UserInfo
    orgs: list[OrgInfo]
    personal: PersonalInfo


class OrgInvite(BaseModel):
    """Invite a GitHub user to an org's Egregore."""
    github_org: str
    github_username: str
    repo_name: str = "egregore-core"


class OrgAcceptInvite(BaseModel):
    """Accept an invite — invitee provides their token + invite token."""
    invite_token: str


class UserProfileUpdate(BaseModel):
    """Update user profile (Telegram handle)."""
    telegram_username: str


# --- Waitlist models ---


class WaitlistAdd(BaseModel):
    """Add to waitlist."""
    email: Optional[str] = None
    github_username: Optional[str] = None
    source: Optional[str] = None


class WaitlistApprove(BaseModel):
    """Approve a waitlist entry."""
    waitlist_id: int

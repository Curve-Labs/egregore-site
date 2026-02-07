from pydantic import BaseModel
from typing import Optional


class GraphQuery(BaseModel):
    statement: str
    parameters: dict = {}


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


class OrgJoin(BaseModel):
    """Joiner: join an existing org."""
    github_org: str


class OrgTelegram(BaseModel):
    """Bot reports its chat_id after being added to a group."""
    org_slug: str
    chat_id: str


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

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

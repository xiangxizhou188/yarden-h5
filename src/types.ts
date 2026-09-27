export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED';
export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TargetSlot = {
  id: string;
  slotCode: string | null;
  slotNumber: number | null;
  rowNumber: number | null;
  columnNumber: number | null;
  varietyName: string | null;
  plantStatus: string | null;
};

export type TargetContext = {
  source: 'SNAPSHOT' | 'CURRENT';
  capturedAt: string | null;
  room: { id: string; name: string | null; facilityName: string | null } | null;
  batch: { id: string; name: string | null; strainName: string | null; status: string | null } | null;
  device: { id: string; name: string | null; type: string | null; status: string | null } | null;
  table: { id: string; name: string | null; roomId: string | null } | null;
  slots: TargetSlot[];
};

export type Issue = {
  id: string;
  issueStatus: IssueStatus;
  description: string;
  issueType: string;
  issueSubtype: string;
  severity: IssueSeverity | null;
  title: string | null;
  resolutionDescription: string | null;
  actionTaken: string | null;
  reportedBy: string | null;
  handledBy: string | null;
  metadata?: { archive?: { reason: string; at: string } } | null;
  reportedAt: string;
  handledAt: string | null;
  room: { id: string; name: string } | null;
  batch: { id: string; name: string; strainName?: string | null } | null;
  device?: { id: string; name: string; type: string | null; status: string | null } | null;
  table: { id: string; name: string } | null;
  targetContext?: TargetContext | null;
  attachments?: MediaAsset[];
};

export type MediaScope = 'ISSUE_REPORT' | 'ISSUE_RESOLUTION' | 'INSPECTION';
export type MediaAsset = {
  id: string;
  facilityName: string;
  scope: MediaScope;
  entityId: string | null;
  contentType: string;
  byteSize: number;
  originalFileName: string | null;
  url: string;
  thumbnailUrl: string;
  createdAt: string;
};

export type User = { id: string; username: string; facilityName: string; role: string };
export type ApiResult<T> = { success: boolean; data?: T; message?: string };

export type NurseryMoveInPlan = {
  title: string;
  facilityName: string;
  rangeDays: number;
  generatedAt: string;
  expiresAt: string | null;
  roomCount: number;
  totalQuantity: number;
  items: { id: string; roomName: string; moveInDate: string; daysAway: number; quantity: number }[];
};

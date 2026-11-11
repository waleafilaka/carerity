export type CareRecordStatus = "Draft" | "In Progress" | "Completed" | "Cancelled";
export type CareRecordPaymentStatus = "Pending" | "Paid" | "Refunded";

export type CareRecordActivity = {
  id: string;
  time: string;
  title: string;
  note?: string;
};

export type CareRecord = {
  id: string;
  publicRecordId: string;
  bookingId?: string;
  visitId?: string;
  careRecipientName?: string;
  caregiverName?: string;
  caregiverRole?: string;
  visitDate: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  status: CareRecordStatus;
  activities: CareRecordActivity[];
  careSummary?: string;
  hourlyRate?: number;
  subtotal?: number;
  taxes?: number;
  total?: number;
  paymentStatus?: CareRecordPaymentStatus;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "carerityCareRecords";

export function getCareRecords(): CareRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeCareRecord)
      .filter((record): record is CareRecord => Boolean(record));
  } catch (error) {
    console.error("Unable to read care records:", error);
    return [];
  }
}

export function saveCareRecords(records: CareRecord[]) {
  if (typeof window === "undefined") return;

  const normalized = records
    .map(normalizeCareRecord)
    .filter((record): record is CareRecord => Boolean(record));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function saveCareRecord(record: CareRecord) {
  const records = getCareRecords();
  const next = normalizeCareRecord(record);
  if (!next) return;

  const index = records.findIndex((item) => item.id === next.id);

  if (index >= 0) records[index] = next;
  else records.push(next);

  saveCareRecords(records);
}

export function getCareRecordById(id: string) {
  return getCareRecords().find(
    (record) => record.id === id || record.publicRecordId === id
  );
}

export function getCompletedCareRecords() {
  return getCareRecords()
    .filter((record) => record.status === "Completed")
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
}

export function createCareRecordId(visitDate: string, source = "") {
  const compactDate = visitDate.replaceAll("-", "");
  const hashSource = source || visitDate || "care-record";
  let hash = 0;

  for (let index = 0; index < hashSource.length; index += 1) {
    hash = (hash * 31 + hashSource.charCodeAt(index)) >>> 0;
  }

  return `CR-${compactDate}-${String(hash % 1_000_000).padStart(6, "0")}`;
}

export function createCareRecordFromCompletedVisit(input: {
  id: string;
  bookingId?: string;
  visitId?: string;
  careRecipientName?: string;
  caregiverName?: string;
  caregiverRole?: string;
  visitDate: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  activities?: CareRecordActivity[];
  careSummary?: string;
  hourlyRate?: number;
  subtotal?: number;
  taxes?: number;
  total?: number;
  paymentStatus?: CareRecordPaymentStatus;
}): CareRecord {
  const now = new Date().toISOString();

  return {
    id: input.id,
    publicRecordId: createCareRecordId(input.visitDate, input.id),
    bookingId: input.bookingId,
    visitId: input.visitId,
    careRecipientName: input.careRecipientName,
    caregiverName: input.caregiverName,
    caregiverRole: input.caregiverRole,
    visitDate: input.visitDate,
    startTime: input.startTime,
    endTime: input.endTime,
    durationHours: input.durationHours || 0,
    status: "Completed",
    activities: input.activities || [],
    careSummary: input.careSummary,
    hourlyRate: input.hourlyRate || 0,
    subtotal: input.subtotal || 0,
    taxes: input.taxes || 0,
    total: input.total || 0,
    paymentStatus: input.paymentStatus || "Pending",
    createdAt: now,
    updatedAt: now,
  };
}

export function downloadCareRecordsReport(
  records: CareRecord[],
  title = "Carerity Care Records Report"
) {
  if (typeof window === "undefined" || records.length === 0) return;

  const text = [
    title,
    "",
    `Generated: ${new Date().toLocaleString("en-CA")}`,
    `Completed visits: ${records.length}`,
    "",
    ...records.flatMap((record) => [
      `Care Record ID: ${record.publicRecordId}`,
      `Date: ${record.visitDate}`,
      `Recipient: ${record.careRecipientName || "Care recipient"}`,
      `Caregiver: ${record.caregiverName || "Not assigned"}`,
      `Hours: ${record.durationHours || 0}`,
      `Status: ${record.status}`,
      `Payment: ${record.paymentStatus || "Pending"}`,
      `Total: CAD ${(record.total || 0).toFixed(2)}`,
      `Summary: ${record.careSummary || "No summary provided."}`,
      "",
    ]),
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `carerity-care-records-${new Date()
    .toISOString()
    .slice(0, 10)}.txt`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function downloadCombinedVisitDocument(records: CareRecord[]) {
  downloadCareRecordsReport(records, "Carerity Combined Visit Document");
}

export function seedSampleCareRecords() {
  if (typeof window === "undefined" || getCareRecords().length > 0) return;

  const base = [
    ["2026-06-04", "Sarah M.", 8, 304],
    ["2026-06-08", "Sarah M.", 6, 228],
    ["2026-06-12", "Grace T.", 8, 304],
    ["2026-06-16", "Sarah M.", 8, 304],
  ] as const;

  saveCareRecords(
    base.map(([visitDate, caregiverName, durationHours, total], index) =>
      createCareRecordFromCompletedVisit({
        id: `care-record-${visitDate}`,
        bookingId: `booking-${visitDate}`,
        careRecipientName: "John Smith",
        caregiverName,
        caregiverRole:
          caregiverName === "Grace T."
            ? "Qualified Caregiver"
            : "PSW Certified Caregiver",
        visitDate,
        startTime: index === 2 ? "10:00" : "09:00",
        endTime:
          durationHours === 6 ? "15:00" : index === 2 ? "18:00" : "17:00",
        durationHours,
        activities: [
          { id: "1", time: "9:03 AM", title: "Caregiver arrived" },
          { id: "2", time: "10:05 AM", title: "Care activity completed" },
          { id: "3", time: "4:58 PM", title: "Visit completed" },
        ],
        careSummary:
          "Scheduled care was completed. No urgent concern was reported.",
        hourlyRate: 38,
        subtotal: total,
        taxes: 0,
        total,
        paymentStatus: "Paid",
      })
    )
  );
}

function normalizeCareRecord(value: unknown): CareRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Partial<CareRecord>;
  if (!record.id || !record.visitDate || !record.status) return null;

  const now = new Date().toISOString();

  return {
    id: record.id,
    publicRecordId:
      record.publicRecordId || createCareRecordId(record.visitDate, record.id),
    bookingId: record.bookingId,
    visitId: record.visitId,
    careRecipientName: record.careRecipientName,
    caregiverName: record.caregiverName,
    caregiverRole: record.caregiverRole,
    visitDate: record.visitDate,
    startTime: record.startTime,
    endTime: record.endTime,
    durationHours: Number(record.durationHours) || 0,
    status: record.status,
    activities: Array.isArray(record.activities) ? record.activities : [],
    careSummary: record.careSummary,
    hourlyRate: Number(record.hourlyRate) || 0,
    subtotal: Number(record.subtotal) || 0,
    taxes: Number(record.taxes) || 0,
    total: Number(record.total) || 0,
    paymentStatus: record.paymentStatus || "Pending",
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
}


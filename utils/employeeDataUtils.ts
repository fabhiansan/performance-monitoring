/**
 * Employee data processing utilities extracted from parser service
 */

import { parseCsvLine } from "./csvUtils";
import {
  determineOrganizationalLevelFromPosition,
  categorizeOrganizationalLevel,
  matchOrganizationalLevelFromSubPosition,
} from "./organizationalLevels";

export interface EmployeeMappingEntry {
  name?: string;
  nip?: string;
  gol?: string;
  pangkat?: string;
  position?: string;
  subPosition?: string;
  organizationalLevel?: string;
  organizational_level?: string;
  detailedPosition?: string;
}

export interface EmployeeMapping {
  [employeeName: string]: EmployeeMappingEntry;
}

type HeaderField =
  | "name"
  | "nip"
  | "gol"
  | "pangkat"
  | "position"
  | "subPosition";

type HeaderIndexMap = Partial<Record<HeaderField, number>>;

const sanitizeNip = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digitsOnly = trimmed.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  return digitsOnly || trimmed.replace(/\s+/g, "");
};

const deriveOrganizationalLevels = (
  position: string,
  subPosition: string,
  gol: string,
): { detailed: string; categorized: string } => {
  const safePosition = position?.trim() || "";
  const safeSubPosition = subPosition?.trim() || "";

  const directMatch = matchOrganizationalLevelFromSubPosition(safeSubPosition);
  const detailedLevel =
    directMatch ||
    determineOrganizationalLevelFromPosition(safePosition, safeSubPosition) ||
    "Staff";

  const isExplicitlyUnknown =
    safePosition &&
    (safePosition.toLowerCase().includes("unknown") ||
      safePosition.toLowerCase().includes("tidak diketahui"));

  const categorySource =
    detailedLevel === "Other" && isExplicitlyUnknown ? "Other" : detailedLevel;

  const categorized = categorizeOrganizationalLevel(
    categorySource,
    detailedLevel === "Other" && isExplicitlyUnknown ? undefined : gol,
  );

  return {
    detailed: detailedLevel,
    categorized:
      typeof categorized === "string" ? categorized : String(categorized),
  };
};

const buildHeaderIndexMap = (headers: string[]): HeaderIndexMap => {
  const map: HeaderIndexMap = {};

  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase();
    if (!normalized) return;

    if (normalized.includes("nama")) {
      map.name ??= index;
      return;
    }

    if (normalized.includes("nip")) {
      map.nip ??= index;
      return;
    }

    if (normalized.includes("gol")) {
      map.gol ??= index;
      return;
    }

    if (normalized.includes("pangkat")) {
      map.pangkat ??= index;
      return;
    }

    if (
      normalized.includes("sub posisi") ||
      normalized.includes("sub-posisi") ||
      normalized.includes("subposisi") ||
      (normalized.includes("sub") && normalized.includes("jabat"))
    ) {
      map.subPosition ??= index;
      return;
    }

    if (normalized.includes("jabatan")) {
      map.position ??= index;
    }
  });

  return map;
};

const createEntryFromColumnIndices = (
  columns: string[],
  indices: {
    name: number;
    nip?: number;
    gol?: number;
    pangkat?: number;
    position?: number;
    subPosition?: number;
  },
): EmployeeMappingEntry | null => {
  if (indices.position === undefined) {
    return null;
  }

  const trimmed = columns.map((col) => (col ?? "").trim());
  const name = trimmed[indices.name] || "";
  if (!name) {
    return null;
  }

  const nipRaw = indices.nip !== undefined ? trimmed[indices.nip] || "" : "";
  const gol = indices.gol !== undefined ? trimmed[indices.gol] || "" : "";
  const pangkat =
    indices.pangkat !== undefined ? trimmed[indices.pangkat] || "" : "";
  const position = trimmed[indices.position] || "";
  const subPosition =
    indices.subPosition !== undefined ? trimmed[indices.subPosition] || "" : "";

  const { detailed, categorized } = deriveOrganizationalLevels(
    position,
    subPosition,
    gol,
  );
  const detailedPosition = determineEmployeePosition(position, subPosition, gol);

  return {
    name,
    nip: sanitizeNip(nipRaw),
    gol,
    pangkat,
    position,
    subPosition,
    organizationalLevel: detailed,
    organizational_level: categorized,
    detailedPosition,
  };
};

const buildMappingEntryFromHeader = (
  row: string[],
  headerMap: HeaderIndexMap,
): EmployeeMappingEntry | null => {
  if (headerMap.name === undefined || headerMap.position === undefined) {
    return null;
  }

  return createEntryFromColumnIndices(row, {
    name: headerMap.name,
    nip: headerMap.nip,
    gol: headerMap.gol,
    pangkat: headerMap.pangkat,
    position: headerMap.position,
    subPosition: headerMap.subPosition,
  });
};

const buildEntryFromFallback = (columns: string[]): EmployeeMappingEntry | null => {
  const trimmed = columns.map((col) => (col ?? "").trim());

  if (trimmed.length >= 7 && trimmed[1]) {
    return createEntryFromColumnIndices(trimmed, {
      name: 1,
      nip: 2,
      gol: 3,
      pangkat: 4,
      position: 5,
      subPosition: 6,
    });
  }

  if (trimmed.length === 6 && trimmed[1]) {
    return createEntryFromColumnIndices(trimmed, {
      name: 1,
      nip: 2,
      gol: 3,
      position: 4,
      subPosition: 5,
    });
  }

  if (trimmed.length >= 5 && !/^\d+$/.test(trimmed[0]) && trimmed[0]) {
    if (trimmed.length >= 6) {
      return createEntryFromColumnIndices(trimmed, {
        name: 0,
        nip: 1,
        gol: 2,
        pangkat: 3,
        position: 4,
        subPosition: 5,
      });
    }

    return createEntryFromColumnIndices(trimmed, {
      name: 0,
      nip: 1,
      gol: 2,
      pangkat: 3,
      position: 4,
    });
  }

  return null;
};

/**
 * Determine detailed staff position based on position and subPosition fields
 */
export const determineStaffPosition = (
  position: string,
  subPosition: string,
  golongan: string,
): string => {
  const positionLower = position.toLowerCase();
  const subPositionLower = subPosition.toLowerCase();

  const isASN = golongan && golongan.match(/^[IVX]+\/[a-d]$/i);
  const asnStatus = isASN ? "ASN" : "Non ASN";

  if (
    positionLower.includes("sekretariat") ||
    subPositionLower.includes("sekretariat")
  ) {
    return `Staff ${asnStatus} Sekretariat`;
  } else if (
    positionLower.includes("hukum") ||
    subPositionLower.includes("hukum")
  ) {
    return `Staff ${asnStatus} Bidang Hukum`;
  } else if (
    positionLower.includes("pemberdayaan") ||
    subPositionLower.includes("pemberdayaan")
  ) {
    return `Staff ${asnStatus} Bidang Pemberdayaan Sosial`;
  } else if (
    positionLower.includes("rehabilitasi") ||
    subPositionLower.includes("rehabilitasi")
  ) {
    return `Staff ${asnStatus} Bidang Rehabilitasi Sosial`;
  } else if (
    positionLower.includes("perlindungan") ||
    subPositionLower.includes("perlindungan") ||
    positionLower.includes("jaminan") ||
    subPositionLower.includes("jaminan")
  ) {
    return `Staff ${asnStatus} Bidang Perlindungan dan Jaminan Sosial`;
  } else if (
    positionLower.includes("bencana") ||
    subPositionLower.includes("bencana") ||
    positionLower.includes("penanganan") ||
    subPositionLower.includes("penanganan")
  ) {
    return `Staff ${asnStatus} Bidang Penanganan Bencana`;
  } else {
    return `Staff ${asnStatus} Sekretariat`;
  }
};

/**
 * Parse employee data from CSV to extract detailed mapping
 */
export const parseEmployeeData = (csvText: string): EmployeeMapping => {
  const trimmed = csvText ? csvText.trim() : "";
  if (!trimmed) {
    return {};
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {};
  }

  const headerColumns = parseCsvLine(lines[0]);
  const headerMap = buildHeaderIndexMap(headerColumns);
  const hasHeader = headerMap.name !== undefined && headerMap.position !== undefined;
  const startIndex = hasHeader ? 1 : 0;

  const employeeMapping: EmployeeMapping = {};

  for (let i = startIndex; i < lines.length; i++) {
    const rawValues = parseCsvLine(lines[i]);
    const rowValues = headerColumns.map((_, index) => rawValues[index] ?? "");

    let entry: EmployeeMappingEntry | null = null;

    if (hasHeader) {
      entry = buildMappingEntryFromHeader(rowValues, headerMap);
    }

    if (!entry) {
      entry = buildEntryFromFallback(rawValues);
    }

    if (entry && entry.name) {
      employeeMapping[entry.name] = entry;
    }
  }

  return employeeMapping;
};

/**
 * Determine employee position based on organizational level rules
 */
export const determineEmployeePosition = (
  position: string,
  subPosition: string,
  golongan: string,
): string => {
  const positionBasedLevel = determineOrganizationalLevelFromPosition(
    position,
    subPosition,
  );

  const isExplicitlyUnknown =
    position &&
    typeof position === "string" &&
    (position.toLowerCase().includes("unknown") ||
      position.toLowerCase().includes("tidak diketahui"));

  const organizationalLevel = categorizeOrganizationalLevel(
    positionBasedLevel === "Other" && isExplicitlyUnknown
      ? "Other"
      : positionBasedLevel === "Other" && !isExplicitlyUnknown
        ? undefined
        : positionBasedLevel,
    positionBasedLevel === "Other" && isExplicitlyUnknown
      ? undefined
      : golongan,
  );

  if (
    organizationalLevel === "Eselon II" ||
    organizationalLevel === "Eselon III" ||
    organizationalLevel === "Eselon IV"
  ) {
    return organizationalLevel;
  } else if (organizationalLevel === "Other") {
    return "Other";
  } else if (organizationalLevel === "Staff") {
    return determineStaffPosition(position, subPosition, golongan);
  } else {
    return determineStaffPosition(position, subPosition, golongan);
  }
};

/**
 * Resolve the most accurate organizational level from multiple sources
 */
export const resolveOrganizationalLevel = (
  employeeName: string,
  dynamicMapping: EmployeeMapping,
  orgLevelMapping: EmployeeMapping,
  dataOrganizationalLevel: string | null,
): string => {
  const candidates = [
    dynamicMapping[employeeName]?.organizationalLevel,
    dynamicMapping[employeeName]?.organizational_level,
    dynamicMapping[employeeName]?.detailedPosition,
    orgLevelMapping[employeeName]?.organizationalLevel,
    orgLevelMapping[employeeName]?.organizational_level,
    orgLevelMapping[employeeName]?.detailedPosition,
    dataOrganizationalLevel || undefined,
  ].filter((level): level is string => Boolean(level));

  return (
    candidates.find((level) => /eselon/i.test(level)) ||
    candidates[0] ||
    "Staff/Other"
  );
};

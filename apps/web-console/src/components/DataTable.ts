export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => string | number | boolean;
  sortable?: boolean | undefined;
  width?: string | undefined;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = 50,
): PaginatedResult<T> {
  const safePageSize = Math.min(200, Math.max(5, pageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(totalPages, Math.max(1, page));
  const startIndex = (currentPage - 1) * safePageSize;
  const paginatedItems = items.slice(startIndex, startIndex + safePageSize);

  return {
    items: paginatedItems,
    totalItems,
    totalPages,
    currentPage,
    pageSize: safePageSize,
  };
}

export function filterItems<T>(
  items: T[],
  query: string,
  searchableFields: (keyof T)[],
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;

  return items.filter(item => {
    return searchableFields.some(field => {
      const val = item[field];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(trimmed);
    });
  });
}

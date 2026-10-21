export interface FavoritesState {
  routeIds: Set<string>;
  stopIds: Set<string>;
}

export class FavoritesManager {
  private routeIds: Set<string>;
  private stopIds: Set<string>;

  constructor(initialRoutes: string[] = [], initialStops: string[] = []) {
    this.routeIds = new Set(initialRoutes);
    this.stopIds = new Set(initialStops);
  }

  isRouteFavorite(routeId: string): boolean {
    return this.routeIds.has(routeId);
  }

  isStopFavorite(stopId: string): boolean {
    return this.stopIds.has(stopId);
  }

  toggleFavoriteRoute(routeId: string): boolean {
    if (this.routeIds.has(routeId)) {
      this.routeIds.delete(routeId);
      return false;
    }
    this.routeIds.add(routeId);
    return true;
  }

  toggleFavoriteStop(stopId: string): boolean {
    if (this.stopIds.has(stopId)) {
      this.stopIds.delete(stopId);
      return false;
    }
    this.stopIds.add(stopId);
    return true;
  }

  getFavoriteRoutes(): string[] {
    return Array.from(this.routeIds);
  }

  getFavoriteStops(): string[] {
    return Array.from(this.stopIds);
  }

  serialize(): { routeIds: string[]; stopIds: string[] } {
    return {
      routeIds: Array.from(this.routeIds),
      stopIds: Array.from(this.stopIds),
    };
  }

  static deserialize(data: { routeIds?: string[]; stopIds?: string[] }): FavoritesManager {
    return new FavoritesManager(data.routeIds ?? [], data.stopIds ?? []);
  }
}

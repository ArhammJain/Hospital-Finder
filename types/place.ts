export type Place = {
  id: number;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    amenity?: string;
    healthcare?: string;
    [key: string]: string | undefined;
  };
};

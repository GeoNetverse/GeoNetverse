import { LatLngExpression } from 'leaflet'

export interface singlePoint {
  id: number;
  radius: number;
  position: LatLngExpression;
}

export interface Line {
  points: number[];
}

export interface Points{
  points: singlePoint[];
}

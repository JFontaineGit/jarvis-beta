export interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
}

export interface ForecastCurrentWeather {
  temperature: number;
  weathercode: number;
  windspeed: number;
}

export interface ForecastDaily {
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  weathercode?: number[];
}

export interface ForecastResponse {
  current_weather?: ForecastCurrentWeather;
  daily?: ForecastDaily;
}

export interface IpLocationResponse {
  city?: string;
  region?: string;
  country_name?: string;
}

export interface ResolvedLocation {
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ForecastResponse,
  GeocodingResponse,
  IpLocationResponse,
  ResolvedLocation
} from '@interfaces';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly forecastUrl = 'https://api.open-meteo.com/v1/forecast';
  private readonly ipLookupUrl = 'https://ipapi.co/json/';

  constructor(private http: HttpClient) {}

  getWeather(message: string): Observable<string> {
    const location = this.extractLocation(message);

    if (location) {
      return this.fetchWeatherForLocation(location);
    }

    return this.estimateLocationFromIp();
  }

  private extractLocation(message: string): string | null {
    if (!message) {
      return null;
    }

    const cleaned = message.trim();
    if (!cleaned) {
      return null;
    }

    const patterns = [
      /(?:clima|tiempo|pronóstico)\s+(?:en|para|de)\s+([a-záéíóúüñ\s]+)/i,
      /(?:en|para|de|sobre)\s+([a-záéíóúüñ\s]+?)(?:\?|\.|!|,|$)/i
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(cleaned);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    // If the entire message looks like a location (e.g., "Buenos Aires")
    if (/^[a-záéíóúüñ\s]+$/i.test(cleaned) && cleaned.length > 2) {
      return cleaned;
    }

    return null;
  }

  private estimateLocationFromIp(): Observable<string> {
    return this.http.get<IpLocationResponse>(this.ipLookupUrl).pipe(
      map(response => {
        const parts = [response.city, response.region, response.country_name]
          .filter(Boolean)
          .map(part => part!.trim());

        if (!parts.length) {
          return 'Por privacidad no puedo usar tu ubicación exacta. Dime la ciudad de la que quieres saber el clima y con gusto la consulto.';
        }

        const approximate = parts.join(', ');
        return `Por privacidad no puedo acceder a tu ubicación exacta. Parece que estás cerca de ${approximate}. Confirmame si quieres el clima de esa ciudad o dime otra que prefieras.`;
      }),
      catchError(() => of('Por privacidad no puedo usar tu ubicación exacta. Dime la ciudad de la que quieres saber el clima y con gusto la consulto.'))
    );
  }

  private fetchWeatherForLocation(locationQuery: string): Observable<string> {
    return this.lookupCoordinates(locationQuery).pipe(
      switchMap(location => this.retrieveForecast(location)),
      catchError(() => of(`No pude obtener datos meteorológicos para ${locationQuery}. ¿Podrías darme otra ciudad?`))
    );
  }

  private lookupCoordinates(location: string): Observable<ResolvedLocation> {
    const params = new HttpParams()
      .set('name', location)
      .set('count', '1')
      .set('language', 'es')
      .set('format', 'json');

    return this.http.get<GeocodingResponse>(this.geocodingUrl, { params }).pipe(
      map(response => {
        const result = response.results?.[0];
        if (!result) {
          throw new Error('Location not found');
        }

        const components = [result.name, result.admin1, result.country]
          .filter(Boolean)
          .map(component => component!.trim());

        return {
          displayName: components.join(', '),
          latitude: result.latitude,
          longitude: result.longitude,
          timezone: result.timezone
        } as ResolvedLocation;
      })
    );
  }

  private retrieveForecast(location: ResolvedLocation): Observable<string> {
    const params = new HttpParams()
      .set('latitude', location.latitude.toString())
      .set('longitude', location.longitude.toString())
      .set('current_weather', 'true')
      .set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode')
      .set('timezone', location.timezone ?? 'auto');

    return this.http.get<ForecastResponse>(this.forecastUrl, { params }).pipe(
      map(forecast => this.composeWeatherSummary(location.displayName, forecast)),
      catchError(() => of(`No pude recuperar el pronóstico para ${location.displayName}. Intenta nuevamente en unos minutos.`))
    );
  }

  private composeWeatherSummary(locationName: string, forecast: ForecastResponse): string {
    if (!forecast.current_weather) {
      return `No recibí datos en tiempo real para ${locationName}, pero puedo intentarlo de nuevo si lo deseas.`;
    }

    const currentTemp = Math.round(forecast.current_weather.temperature);
    const condition = this.describeWeatherCode(forecast.current_weather.weathercode);

    const highs = forecast.daily?.temperature_2m_max?.[0];
    const lows = forecast.daily?.temperature_2m_min?.[0];
    const precipitation = forecast.daily?.precipitation_probability_max?.[0];

    const parts: string[] = [
      `En ${locationName} ahora ${condition.toLowerCase()} con ${currentTemp}°C.`
    ];

    if (typeof highs === 'number' && typeof lows === 'number') {
      parts.push(`Para hoy se esperan máximas de ${Math.round(highs)}°C y mínimas de ${Math.round(lows)}°C.`);
    }

    if (typeof precipitation === 'number') {
      parts.push(`La probabilidad de lluvia ronda el ${Math.round(precipitation)}%.`);
    }

    parts.push(`El viento sopla a unos ${Math.round(forecast.current_weather.windspeed)} km/h.`);

    return parts.join(' ');
  }

  private describeWeatherCode(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'está despejado',
      1: 'hay algo de nubosidad',
      2: 'hay nubosidad variable',
      3: 'el cielo está cubierto',
      45: 'hay niebla',
      48: 'hay niebla escarchada',
      51: 'llovizna ligera',
      53: 'llovizna moderada',
      55: 'llovizna intensa',
      56: 'llovizna helada ligera',
      57: 'llovizna helada intensa',
      61: 'lluvia ligera',
      63: 'lluvia moderada',
      65: 'lluvia fuerte',
      66: 'lluvia helada ligera',
      67: 'lluvia helada intensa',
      71: 'nevadas ligeras',
      73: 'nevadas moderadas',
      75: 'nevadas intensas',
      77: 'hay granizo',
      80: 'chubascos ligeros',
      81: 'chubascos moderados',
      82: 'chubascos intensos',
      85: 'nevadas ligeras intermitentes',
      86: 'nevadas intensas intermitentes',
      95: 'tormentas eléctricas',
      96: 'tormentas con algo de granizo',
      99: 'tormentas con granizo intenso'
    };

    return descriptions[code] ?? 'hay condiciones cambiantes';
  }
}

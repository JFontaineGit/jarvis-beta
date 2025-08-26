import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ApiResponse } from '../../../models/message.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(url: string, headers?: HttpHeaders): Observable<T> {
    return this.http.get<T>(url, { headers })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  post<T>(url: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(url, body, { headers })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  postForBlob(url: string, body: any, headers?: HttpHeaders): Observable<Blob> {
    return this.http.post(url, body, { 
      headers, 
      responseType: 'blob' 
    }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`;
      
      if (error.status === 402) {
        errorMessage = 'Payment required. Please check your API key balance.';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized. Please check your API key.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      }
    }

    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
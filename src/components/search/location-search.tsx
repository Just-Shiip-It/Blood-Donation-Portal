'use client'

import React, { useState, useCallback } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface LocationData {
    address: string
    coordinates?: {
        lat: number
        lng: number
    }
    radius: number
}

interface LocationSearchProps {
    onLocationChange: (location: LocationData) => void
    initialLocation?: LocationData
    className?: string
    showCurrentLocation?: boolean
    radiusOptions?: number[]
}

interface GeolocationPosition {
    coords: {
        latitude: number
        longitude: number
    }
}

export function LocationSearch({
    onLocationChange,
    initialLocation,
    className,
    showCurrentLocation = true,
    radiusOptions = [5, 10, 25, 50, 100],
}: LocationSearchProps) {
    const [address, setAddress] = useState(initialLocation?.address || '')
    const [radius, setRadius] = useState(initialLocation?.radius || 25)
    const [coordinates, setCoordinates] = useState(initialLocation?.coordinates)
    const [isLoadingLocation, setIsLoadingLocation] = useState(false)
    const [locationError, setLocationError] = useState<string | null>(null)

    // Geocoding function (simplified - in production, use a proper geocoding service)
    const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
        try {
            // This is a placeholder - in production, integrate with Google Maps Geocoding API
            // or another geocoding service
            console.log('Geocoding address:', address)

            // For demo purposes, return mock coordinates
            // In production, replace with actual geocoding API call
            if (address.toLowerCase().includes('new york')) {
                return { lat: 40.7128, lng: -74.0060 }
            } else if (address.toLowerCase().includes('los angeles')) {
                return { lat: 34.0522, lng: -118.2437 }
            } else if (address.toLowerCase().includes('chicago')) {
                return { lat: 41.8781, lng: -87.6298 }
            }

            // Default to a central location if no match
            return { lat: 39.8283, lng: -98.5795 } // Geographic center of US
        } catch (error) {
            console.error('Geocoding error:', error)
            return null
        }
    }, [])

    // Get current location using browser geolocation
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by this browser')
            return
        }

        setIsLoadingLocation(true)
        setLocationError(null)

        navigator.geolocation.getCurrentPosition(
            async (position: GeolocationPosition) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                }

                setCoordinates(coords)

                // Reverse geocode to get address (simplified)
                try {
                    // In production, use a reverse geocoding service
                    const reverseGeocodedAddress = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    setAddress(reverseGeocodedAddress)

                    const locationData: LocationData = {
                        address: reverseGeocodedAddress,
                        coordinates: coords,
                        radius,
                    }

                    onLocationChange(locationData)
                } catch (error) {
                    console.error('Reverse geocoding error:', error)
                    setLocationError('Failed to get address for current location')
                } finally {
                    setIsLoadingLocation(false)
                }
            },
            (error) => {
                setIsLoadingLocation(false)
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location access denied by user')
                        break
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information is unavailable')
                        break
                    case error.TIMEOUT:
                        setLocationError('Location request timed out')
                        break
                    default:
                        setLocationError('An unknown error occurred while retrieving location')
                        break
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        )
    }, [radius, onLocationChange])

    // Handle address input change
    const handleAddressChange = useCallback(async (newAddress: string) => {
        setAddress(newAddress)
        setLocationError(null)

        if (newAddress.trim()) {
            const coords = await geocodeAddress(newAddress)
            setCoordinates(coords || undefined)

            const locationData: LocationData = {
                address: newAddress,
                coordinates: coords || undefined,
                radius,
            }

            onLocationChange(locationData)
        }
    }, [geocodeAddress, radius, onLocationChange])

    // Handle radius change
    const handleRadiusChange = useCallback((newRadius: number) => {
        setRadius(newRadius)

        const locationData: LocationData = {
            address,
            coordinates,
            radius: newRadius,
        }

        onLocationChange(locationData)
    }, [address, coordinates, onLocationChange])



    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Search
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="address">Address or Location</Label>
                    <div className="flex gap-2">
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            placeholder="Enter city, state, or zip code"
                            className="flex-1"
                        />
                        {showCurrentLocation && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={getCurrentLocation}
                                disabled={isLoadingLocation}
                                className="shrink-0"
                            >
                                {isLoadingLocation ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Navigation className="h-4 w-4" />
                                )}
                                {isLoadingLocation ? 'Getting...' : 'Current'}
                            </Button>
                        )}
                    </div>
                    {locationError && (
                        <p className="text-sm text-destructive">{locationError}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="radius">Search Radius</Label>
                    <Select
                        value={radius.toString()}
                        onValueChange={(value) => handleRadiusChange(parseInt(value))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {radiusOptions.map((option) => (
                                <SelectItem key={option} value={option.toString()}>
                                    {option} miles
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {coordinates && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Current Location</Label>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                                Lat: {coordinates.lat.toFixed(4)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                Lng: {coordinates.lng.toFixed(4)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                Radius: {radius} miles
                            </Badge>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Export utility function for other components to use
export { LocationSearch as default }
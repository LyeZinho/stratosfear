import * as turf from "@turf/turf";
import { Coordinates } from "../types/game";

/**
 * Calcula o Horizonte de Radar baseado na altitude do radar e do alvo.
 * Dmax ≈ 4.12 * (sqrt(hr) + sqrt(ht))
 */
export function getRadarHorizon(hRadar: number, hTarget: number): number {
  // hRadar e hTarget em metros
  return 4.12 * (Math.sqrt(hRadar) + Math.sqrt(hTarget));
}

/**
 * Calcula a distância entre duas coordenadas em KM.
 */
export function getDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const from = turf.point([c1.lng, c1.lat]);
  const to = turf.point([c2.lng, c2.lat]);
  return turf.distance(from, to);
}

/**
 * Calcula a posição futura baseada em velocidade, rumo e tempo.
 */
export function getNextPosition(
  current: Coordinates,
  heading: number,
  speedMach: number,
  deltaTimeSeconds: number
): Coordinates {
  // 1 Mach ≈ 1234.8 km/h ≈ 0.343 km/s
  const speedKms = speedMach * 0.343;
  const distance = speedKms * deltaTimeSeconds;
  
  const point = turf.point([current.lng, current.lat]);
  const destination = turf.destination(point, distance, heading, { units: "kilometers" });
  
  return {
    lat: destination.geometry.coordinates[1],
    lng: destination.geometry.coordinates[0]
  };
}

/**
 * Calcula o ângulo de aspecto entre o radar e o alvo.
 * @param radarPos Posição do radar
 * @param targetPos Posição do alvo
 * @param targetHeading Rumo do alvo (em graus)
 * @returns Ângulo de aspecto (0 = frente, 180 = cauda, 90 = lado)
 */
export function calculateAspectAngle(
  radarPos: Coordinates,
  targetPos: Coordinates,
  targetHeading: number
): number {
  const from = turf.point([radarPos.lng, radarPos.lat]);
  const to = turf.point([targetPos.lng, targetPos.lat]);
  const bearingToRadar = turf.bearing(to, from); // Rumo do alvo para o radar
  
  // Diferença entre o rumo do alvo e o rumo para o radar
  let diff = Math.abs(targetHeading - bearingToRadar);
  if (diff > 180) diff = 360 - diff;
  
  return diff;
}

/**
 * Calcula o RCS dinâmico baseado no ângulo de aspecto.
 */
export function getDynamicRCS(frontRCS: number, sideRCS: number, aspectAngle: number): number {
  // aspectAngle em graus (0 = frente, 90 = lado, 180 = cauda)
  // Simplificado: usamos o seno para o lado e cosseno para frente/trás
  const rad = (aspectAngle * Math.PI) / 180;
  const rcs = Math.abs(frontRCS * Math.cos(rad)) + Math.abs(sideRCS * Math.sin(rad));
  return rcs;
}

/**
 * Calcula a probabilidade de detecção baseada em vários fatores.
 */
export function calculateDetectionProbability(
  distance: number,
  maxRange: number,
  rcs: number,
  ecmStrength: number = 0,
  weatherFactor: number = 1
): number {
  // Equação básica do radar: P ~ RCS / R^4
  // Normalizamos para o maxRange (onde RCS=1 seria detectado)
  const baseProb = (rcs * Math.pow(maxRange / distance, 4)) * weatherFactor;
  
  // ECM reduz a probabilidade
  const finalProb = baseProb * (1 - ecmStrength);
  
  return Math.min(1, Math.max(0, finalProb));
}

/**
 * Calcula o combustível necessário para percorrer uma distância em uma certa velocidade.
 */
export function calculateFuelNeeded(
  distanceKm: number,
  speedMach: number,
  fuelConsumptionBase: number
): number {
  // 1 Mach ≈ 1234.8 km/h ≈ 20.58 km/min
  const speedKmMin = speedMach * 20.58;
  const timeMin = distanceKm / speedKmMin;
  const fuelBurn = (fuelConsumptionBase) * timeMin * (speedMach / 0.8);
  return fuelBurn;
}

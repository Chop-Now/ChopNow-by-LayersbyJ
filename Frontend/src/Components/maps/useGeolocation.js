export function useGeolocation() {
  const getCurrentLocation = (onSuccess, onError) => {
    if (!navigator.geolocation) {
      onError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        onSuccess({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => onError('Location permission denied')
    );
  };

  return { getCurrentLocation };
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:chopnow/features/home/home_screen.dart';

/// Raw listing maps, as returned by GET /listings/nearby (distance in km).
Map<String, dynamic> _listing(String id, double? distance) => {
      '_id': id,
      'title': 'Listing $id',
      'description': 'test',
      'pricing': {'price': 3000, 'originalPrice': 5000},
      'inventory': {'quantity': 5},
      if (distance != null) 'distance': distance,
    };

Future<List<String>> _visibleIds(ProviderContainer container) async {
  // filteredListingsProvider derives from the (overridden) listingsProvider.
  await container.read(listingsProvider.future);
  final result = container.read(filteredListingsProvider);
  return result.requireValue.map((l) => (l as Map)['_id'] as String).toList();
}

ProviderContainer _container(List<Map<String, dynamic>> listings) {
  final container = ProviderContainer(overrides: [
    listingsProvider.overrideWith((ref) async => listings),
  ]);
  // Keep the autoDispose providers alive for the duration of the test.
  container.listen(filteredListingsProvider, (_, __) {});
  return container;
}

void main() {
  group('Home distance filter (H19)', () {
    test('slider excludes listings outside the selected radius', () async {
      final container = _container([
        _listing('near', 1.2),
        _listing('mid', 4.8),
        _listing('far', 12.0),
      ]);
      addTearDown(container.dispose);

      container.read(listingFiltersProvider.notifier).state =
          const ListingFilters(maxDistance: 5.0);

      expect(await _visibleIds(container), unorderedEquals(['near', 'mid']));
    });

    test('at the maximum radius, nothing is filtered out by distance', () async {
      final container = _container([
        _listing('near', 1.2),
        _listing('unknown', null),
      ]);
      addTearDown(container.dispose);

      expect(await _visibleIds(container), unorderedEquals(['near', 'unknown']));
    });

    test('an unknown distance is never treated as being within the radius', () async {
      final container = _container([
        _listing('near', 1.2),
        _listing('unknown', null),
      ]);
      addTearDown(container.dispose);

      container.read(listingFiltersProvider.notifier).state =
          const ListingFilters(maxDistance: 3.0);

      expect(await _visibleIds(container), ['near']);
    });

    test('sorting by distance puts the nearest first and unknowns last', () async {
      final container = _container([
        _listing('unknown', null),
        _listing('far', 9.0),
        _listing('near', 0.5),
      ]);
      addTearDown(container.dispose);

      container.read(listingFiltersProvider.notifier).state =
          const ListingFilters(sortBy: 'distance');

      expect(await _visibleIds(container), ['near', 'far', 'unknown']);
    });
  });
}

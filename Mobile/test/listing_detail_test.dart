import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:chopnow/core/models/listing_model.dart';
import 'package:chopnow/core/providers/listings_provider.dart';
import 'package:chopnow/features/listings/listing_detail_screen.dart';

void main() {
  testWidgets('ListingDetailScreen renders details page correctly', (WidgetTester tester) async {
    final listing = Listing(
      id: '69846586aab8d3797639b8c9',
      title: 'Eddy',
      description: 'dsffffffffffffffffffffffb',
      price: 20000,
      offerPrice: 10000,
      quantity: 5,
      photos: ['https://res.cloudinary.com/db0yxb359/image/upload/v1770284426/chopnow/listings/vzbrawbqdlkkkwutsta6.jpg'],
      availableUntil: DateTime.parse("2026-05-31T14:45:00.000Z"),
      business: const {
        'name': 'Chop Test',
        'type': 'farmer',
      },
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          listingDetailProvider(listing.id).overrideWith((ref) => Future.value(listing)),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: ListingDetailScreen(listingId: listing.id),
          ),
        ),
      ),
    );

    // Pump to resolve future
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Verify error is printed if test fails
    expect(find.text('Eddy'), findsOneWidget);
    expect(find.text('Chop Test'), findsOneWidget);
    expect(find.text('RWF 10000'), findsOneWidget);
  });
}

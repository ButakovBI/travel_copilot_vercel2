import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.copilotActionLog.deleteMany();
  await prisma.copilotDraft.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.pastTrip.deleteMany();
  await prisma.paymentStats.deleteMany();
  await prisma.phoneVerificationCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.train.deleteMany();
  await prisma.visaInfo.deleteMany();

  const purchaseHistoryU1 = [
    { category: "restaurant", amountRub: 12500, month: "2025-01" },
    { category: "travel", amountRub: 22000, month: "2025-01" },
    { category: "restaurant", amountRub: 9800, month: "2025-02" },
    { category: "travel", amountRub: 15000, month: "2025-02" },
    { category: "restaurant", amountRub: 14200, month: "2025-03" },
    { category: "luxury", amountRub: 8500, month: "2025-03" },
  ];
  const purchaseHistoryU2 = [
    { category: "restaurant", amountRub: 38000, month: "2025-01" },
    { category: "travel", amountRub: 95000, month: "2025-01" },
    { category: "luxury", amountRub: 42000, month: "2025-02" },
    { category: "travel", amountRub: 78000, month: "2025-02" },
    { category: "restaurant", amountRub: 29000, month: "2025-03" },
    { category: "luxury", amountRub: 35000, month: "2025-03" },
  ];
  const purchaseHistoryU3 = [
    { category: "restaurant", amountRub: 3200, month: "2025-01" },
    { category: "travel", amountRub: 12000, month: "2025-01" },
    { category: "restaurant", amountRub: 2800, month: "2025-02" },
    { category: "travel", amountRub: 8500, month: "2025-02" },
    { category: "restaurant", amountRub: 4100, month: "2025-03" },
    { category: "travel", amountRub: 9500, month: "2025-03" },
  ];

  const u1 = await prisma.user.create({
    data: {
      phone: "+79001234567",
      name: "Алексей",
      cashbackTravelCurrentMonthRub: 1200,
      purchaseHistoryJson: JSON.stringify(purchaseHistoryU1),
    },
  });
  const u2 = await prisma.user.create({
    data: {
      phone: "+79007654321",
      name: "Мария",
      cashbackTravelCurrentMonthRub: 4500,
      purchaseHistoryJson: JSON.stringify(purchaseHistoryU2),
    },
  });
  const u3 = await prisma.user.create({
    data: {
      phone: "+79001112233",
      name: "Дмитрий",
      cashbackTravelCurrentMonthRub: 450,
      purchaseHistoryJson: JSON.stringify(purchaseHistoryU3),
    },
  });

  await prisma.paymentStats.createMany({
    data: [
      { userId: u1.id, avgMonthlySpendRub: 45000, restaurantSpendPct: 0.35, travelSpendPct: 0.25, luxurySpendPct: 0.15 },
      { userId: u2.id, avgMonthlySpendRub: 120000, restaurantSpendPct: 0.22, travelSpendPct: 0.4, luxurySpendPct: 0.3 },
      { userId: u3.id, avgMonthlySpendRub: 28000, restaurantSpendPct: 0.1, travelSpendPct: 0.5, luxurySpendPct: 0.02 },
    ],
  });

  await prisma.pastTrip.createMany({
    data: [
      { userId: u1.id, destination: "Сочи", type: "hotel", avgPriceRub: 8500, stars: 4 },
      { userId: u1.id, destination: "Казань", type: "hotel", avgPriceRub: 6000, stars: 3 },
      { userId: u2.id, destination: "Черногория", type: "bundle", avgPriceRub: 95000, stars: 5 },
      { userId: u2.id, destination: "Санкт-Петербург", type: "hotel", avgPriceRub: 18000, stars: 5 },
      { userId: u3.id, destination: "Краснодар", type: "train", avgPriceRub: 3500, stars: null },
      { userId: u3.id, destination: "Воронеж", type: "train", avgPriceRub: 2800, stars: null },
    ],
  });

  const cities = [
    { code: "MOW", name: "Москва" },
    { code: "LED", name: "Санкт-Петербург" },
    { code: "KZN", name: "Казань" },
    { code: "AER", name: "Сочи" },
    { code: "SVX", name: "Екатеринбург" },
    { code: "IST", name: "Стамбул" },
    { code: "TGD", name: "Подгорица" },
    { code: "LJU", name: "Любляна" },
    { code: "VAR", name: "Варна" },
    { code: "PRG", name: "Прага" },
  ];

  const img = (slug: string) => `https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80`;
  await prisma.flight.createMany({
    data: [
      { origin: "Москва", destination: "Сочи", departureAt: "2025-06-15 08:00", arrivalAt: "2025-06-15 10:30", carrier: "S7", flightNumber: "S7 123", priceRub: 8500, direct: true, availableSeats: 12, imageUrl: img("sochi") },
      { origin: "Москва", destination: "Сочи", departureAt: "2025-06-15 14:00", arrivalAt: "2025-06-15 16:30", carrier: "Аэрофлот", flightNumber: "SU 456", priceRub: 12000, direct: true, availableSeats: 8, imageUrl: img("sochi2") },
      { origin: "Москва", destination: "Казань", departureAt: "2025-06-20 07:00", arrivalAt: "2025-06-20 08:40", carrier: "Победа", flightNumber: "DP 789", priceRub: 3500, direct: true, availableSeats: 25, imageUrl: img("kazan") },
      { origin: "Москва", destination: "Санкт-Петербург", departureAt: "2025-06-18 09:00", arrivalAt: "2025-06-18 10:30", carrier: "Аэрофлот", flightNumber: "SU 101", priceRub: 5500, direct: true, availableSeats: 15, imageUrl: img("spb") },
      { origin: "Москва", destination: "Стамбул", departureAt: "2025-07-01 06:00", arrivalAt: "2025-07-01 09:30", carrier: "Turkish Airlines", flightNumber: "TK 414", priceRub: 18500, direct: true, availableSeats: 20, imageUrl: img("ist") },
      { origin: "Москва", destination: "Подгорица", departureAt: "2025-07-05 10:00", arrivalAt: "2025-07-05 14:00", carrier: "Red Wings", flightNumber: "WZ 100", priceRub: 22000, direct: true, availableSeats: 10, imageUrl: img("tgd") },
      { origin: "Москва", destination: "Варна", departureAt: "2025-07-10 08:00", arrivalAt: "2025-07-10 11:00", carrier: "S7", flightNumber: "S7 200", priceRub: 15000, direct: true, availableSeats: 14, imageUrl: img("varna") },
      { origin: "Москва", destination: "Прага", departureAt: "2025-07-12 07:00", arrivalAt: "2025-07-12 09:30", carrier: "Aeroflot", flightNumber: "SU 2000", priceRub: 25000, direct: true, availableSeats: 5, imageUrl: img("prg") },
      { origin: "Санкт-Петербург", destination: "Москва", departureAt: "2025-06-22 18:00", arrivalAt: "2025-06-22 19:30", carrier: "S7", flightNumber: "S7 102", priceRub: 5200, direct: true, availableSeats: 18, imageUrl: img("mow") },
      { origin: "Москва", destination: "Екатеринбург", departureAt: "2025-06-25 11:00", arrivalAt: "2025-06-25 13:40", carrier: "Уральские авиалинии", flightNumber: "U6 300", priceRub: 6200, direct: true, availableSeats: 22, imageUrl: img("svx") },
      { origin: "Москва", destination: "Краснодар", departureAt: "2025-06-16 10:00", arrivalAt: "2025-06-16 12:10", carrier: "S7", flightNumber: "S7 301", priceRub: 7200, direct: true, availableSeats: 18, imageUrl: img("krd") },
      { origin: "Москва", destination: "Нижний Новгород", departureAt: "2025-06-19 08:00", arrivalAt: "2025-06-19 09:20", carrier: "Аэрофлот", flightNumber: "SU 501", priceRub: 4800, direct: true, availableSeats: 20, imageUrl: img("nnov") },
      { origin: "Москва", destination: "Калининград", departureAt: "2025-06-28 07:00", arrivalAt: "2025-06-28 09:00", carrier: "Победа", flightNumber: "DP 901", priceRub: 5900, direct: true, availableSeats: 30, imageUrl: img("kgd") },
      { origin: "Москва", destination: "Новосибирск", departureAt: "2025-06-26 06:00", arrivalAt: "2025-06-26 10:30", carrier: "S7", flightNumber: "S7 401", priceRub: 12500, direct: true, availableSeats: 14, imageUrl: img("ovb") },
      { origin: "Москва", destination: "Минск", departureAt: "2025-07-08 12:00", arrivalAt: "2025-07-08 13:20", carrier: "Белавиа", flightNumber: "B2 800", priceRub: 9500, direct: true, availableSeats: 25, imageUrl: img("msq") },
      { origin: "Москва", destination: "Баку", departureAt: "2025-07-15 09:00", arrivalAt: "2025-07-15 12:30", carrier: "Азербайджанские авиалинии", flightNumber: "J2 100", priceRub: 19800, direct: true, availableSeats: 12, imageUrl: img("baku") },
    ],
  });

  const hotelImg = (s: string) => `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80`;
  await prisma.hotel.createMany({
    data: [
      { city: "Сочи", name: "Родина", stars: 4, pricePerNightRub: 15500, amenities: "бассейн, Wi-Fi, ресторан", availableRooms: 8, imageUrl: hotelImg("1") },
      { city: "Сочи", name: "Сочи Плаза", stars: 5, pricePerNightRub: 28000, amenities: "бассейн, СПА, пляж", availableRooms: 5, imageUrl: hotelImg("2") },
      { city: "Сочи", name: "Жемчужина", stars: 3, pricePerNightRub: 7500, amenities: "Wi-Fi, завтрак", availableRooms: 20, imageUrl: hotelImg("sochi3") },
      { city: "Казань", name: "Родина", stars: 4, pricePerNightRub: 15500, amenities: "бассейн закрытый, Wi-Fi", availableRooms: 12, imageUrl: hotelImg("3") },
      { city: "Казань", name: "Kazan Palace", stars: 5, pricePerNightRub: 18000, amenities: "бассейн на крыше, ресторан", availableRooms: 6, imageUrl: hotelImg("4") },
      { city: "Казань", name: "Grand Opéra", stars: 5, pricePerNightRub: 20000, amenities: "бассейн, СПА, рядом Кремль", availableRooms: 4, imageUrl: hotelImg("5") },
      { city: "Казань", name: "Ногай", stars: 3, pricePerNightRub: 5500, amenities: "Wi-Fi, парковка", availableRooms: 18, imageUrl: hotelImg("kazan3") },
      { city: "Санкт-Петербург", name: "Отель у Эрмитажа", stars: 4, pricePerNightRub: 12000, amenities: "центр, Wi-Fi", availableRooms: 15, imageUrl: hotelImg("6") },
      { city: "Санкт-Петербург", name: "Астория", stars: 5, pricePerNightRub: 35000, amenities: "люкс, ресторан, консьерж", availableRooms: 3, imageUrl: hotelImg("7") },
      { city: "Санкт-Петербург", name: "Станция L1", stars: 3, pricePerNightRub: 6500, amenities: "хостел, кухня", availableRooms: 25, imageUrl: hotelImg("spb3") },
      { city: "Будва", name: "Hotel Splendid", stars: 5, pricePerNightRub: 22000, amenities: "море, бассейн, полный пансион", availableRooms: 7, imageUrl: hotelImg("8") },
      { city: "Варна", name: "Grand Hotel Varna", stars: 4, pricePerNightRub: 9500, amenities: "пляж, бассейн", availableRooms: 10, imageUrl: hotelImg("9") },
      { city: "Варна", name: "Черно море", stars: 3, pricePerNightRub: 5200, amenities: "пляж, Wi-Fi", availableRooms: 14, imageUrl: hotelImg("varna2") },
      { city: "Прага", name: "Four Seasons Prague", stars: 5, pricePerNightRub: 45000, amenities: "центр, ресторан, СПА", availableRooms: 4, imageUrl: hotelImg("10") },
      { city: "Прага", name: "U Zlaté studně", stars: 4, pricePerNightRub: 18500, amenities: "старый город, ресторан", availableRooms: 9, imageUrl: hotelImg("prg2") },
      { city: "Стамбул", name: "Ciragan Palace", stars: 5, pricePerNightRub: 38000, amenities: "Босфор, СПА, ресторан", availableRooms: 5, imageUrl: hotelImg("11") },
      { city: "Стамбул", name: "Sultanahmet Suites", stars: 4, pricePerNightRub: 12500, amenities: "центр, вид на Босфор", availableRooms: 12, imageUrl: hotelImg("ist2") },
      { city: "Екатеринбург", name: "Хаятт", stars: 5, pricePerNightRub: 22000, amenities: "центр, СПА, ресторан", availableRooms: 6, imageUrl: hotelImg("svx1") },
      { city: "Екатеринбург", name: "Онегин", stars: 4, pricePerNightRub: 9500, amenities: "Wi-Fi, завтрак", availableRooms: 11, imageUrl: hotelImg("svx2") },
      { city: "Краснодар", name: "Мариотт", stars: 4, pricePerNightRub: 11000, amenities: "бассейн, Wi-Fi", availableRooms: 10, imageUrl: hotelImg("krd1") },
      { city: "Краснодар", name: "Платан", stars: 3, pricePerNightRub: 4800, amenities: "Wi-Fi, парковка", availableRooms: 22, imageUrl: hotelImg("krd2") },
      { city: "Нижний Новгород", name: "Ока", stars: 4, pricePerNightRub: 8500, amenities: "центр, ресторан", availableRooms: 15, imageUrl: hotelImg("nnov1") },
      { city: "Нижний Новгород", name: "Азимут", stars: 3, pricePerNightRub: 4200, amenities: "Wi-Fi", availableRooms: 30, imageUrl: hotelImg("nnov2") },
      { city: "Калининград", name: "Рэдиссон", stars: 4, pricePerNightRub: 14000, amenities: "центр, СПА", availableRooms: 8, imageUrl: hotelImg("kgd1") },
      { city: "Новосибирск", name: "Новосибирск Мариотт", stars: 4, pricePerNightRub: 10200, amenities: "центр, завтрак", availableRooms: 12, imageUrl: hotelImg("ovb1") },
      { city: "Минск", name: "Европа", stars: 5, pricePerNightRub: 19500, amenities: "исторический центр, ресторан", availableRooms: 7, imageUrl: hotelImg("msq1") },
      { city: "Баку", name: "Four Seasons Baku", stars: 5, pricePerNightRub: 42000, amenities: "набережная, СПА", availableRooms: 5, imageUrl: hotelImg("baku1") },
    ],
  });

  await prisma.train.createMany({
    data: [
      { origin: "Москва", destination: "Санкт-Петербург", departureAt: "2025-06-18 23:00", arrivalAt: "2025-06-19 07:00", carrier: "РЖД", priceRub: 3500, availableSeats: 50 },
      { origin: "Москва", destination: "Казань", departureAt: "2025-06-20 22:00", arrivalAt: "2025-06-21 09:00", carrier: "РЖД", priceRub: 2800, availableSeats: 80 },
      { origin: "Москва", destination: "Сочи", departureAt: "2025-06-14 18:00", arrivalAt: "2025-06-15 12:00", carrier: "РЖД", priceRub: 5500, availableSeats: 40 },
      { origin: "Санкт-Петербург", destination: "Москва", departureAt: "2025-06-22 23:30", arrivalAt: "2025-06-23 08:00", carrier: "РЖД", priceRub: 3800, availableSeats: 45 },
      { origin: "Москва", destination: "Екатеринбург", departureAt: "2025-06-24 15:00", arrivalAt: "2025-06-25 10:00", carrier: "РЖД", priceRub: 4200, availableSeats: 60 },
      { origin: "Москва", destination: "Краснодар", departureAt: "2025-06-16 20:00", arrivalAt: "2025-06-17 14:00", carrier: "РЖД", priceRub: 4200, availableSeats: 55 },
      { origin: "Москва", destination: "Нижний Новгород", departureAt: "2025-06-19 23:00", arrivalAt: "2025-06-20 07:00", carrier: "РЖД", priceRub: 2200, availableSeats: 70 },
      { origin: "Москва", destination: "Новосибирск", departureAt: "2025-06-26 14:00", arrivalAt: "2025-06-27 16:00", carrier: "РЖД", priceRub: 5800, availableSeats: 45 },
    ],
  });

  await prisma.visaInfo.createMany({
    data: [
      { countryCode: "RU", countryName: "Россия", visaRequired: false, notes: null },
      { countryCode: "TR", countryName: "Турция", visaRequired: false, notes: "Безвиз до 60 дней" },
      { countryCode: "ME", countryName: "Черногория", visaRequired: false, notes: "Безвиз до 90 дней" },
      { countryCode: "SI", countryName: "Словения", visaRequired: true, notes: "Шенген" },
      { countryCode: "BG", countryName: "Болгария", visaRequired: true, notes: "Отдельная виза или Шенген" },
      { countryCode: "CZ", countryName: "Чехия", visaRequired: true, notes: "Шенген" },
    ],
  });

  console.log("Seed done: 3 users, payment stats, past trips, flights, hotels, trains, visa info.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

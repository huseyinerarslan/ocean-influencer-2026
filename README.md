# Ocean Influencer Operasyon v7 Web

Bu sürüm v6.6'nın çalışan sipariş / yazdırma / ürün-set / yazı şablonu özelliklerini web mimarisine taşır.

## Temel değişiklikler

- IndexedDB / tarayıcı içi veri yerine **PostgreSQL** kullanır.
- Kullanıcı girişi sunucuda doğrulanır; oturum HTTP-only cookie ile tutulur.
- Siparişler, sipariş kalemleri, kişiler, adresler, ürünler, setler ve yazı şablonları SQL tarafında saklanır.
- Yeni sipariş numarası sunucuda atomik üretilir; birden fazla kullanıcı aynı anda kayıt açabilir.
- Sipariş ekranında arama + durum + **tek gün + tarih aralığı + Bugün / Dün / Bu Hafta** filtreleri vardır.
- Günlük sipariş kartları ile gün gün görüntüleme yapılabilir.
- Eski **SAP Hızlı Kopya** sayfası ve butonları kaldırılmıştır.
- SAP irsaliyesi şimdilik manuel takip edilir; sipariş detayında irsaliye no ve tamamlandı işareti tutulabilir.
- DHL eCommerce entegrasyonu için backend uç noktası hazırdır; DHL credential/dokümanı geldiğinde gerçek çağrı bağlanacaktır.
- Excel içe aktarma korunmuştur ama artık ana veri kaynağı değil, toplu/eski kayıt aktarım aracıdır.

## Veritabanı tabloları

`users`, `contacts`, `addresses`, `orders`, `order_items`, `products`, `product_sets`, `set_items`, `letter_templates`, `shipments`, `activity_logs`, `app_meta`, `app_store`, `deleted_orders`, `manual_people`.

Tablolar uygulama ilk açıldığında otomatik oluşturulur.

## Railway'e kurulum

1. Bu repository'yi Railway'de **New Project → Deploy from GitHub Repo** ile seçin.
2. Aynı Railway projesine **PostgreSQL** servisi ekleyin.
3. Web servisinin Variables bölümünde PostgreSQL'in `DATABASE_URL` değişkenini bağlayın.
4. Aşağıdaki değişkenleri ekleyin:

```env
NODE_ENV=production
JWT_SECRET=uzun-rastgele-bir-secret
ADMIN_USER=admin
ADMIN_PASSWORD=guclu-ilk-sifre
```

5. Deploy tamamlandığında Railway'in oluşturduğu public domain'i açın.
6. `/health` adresi `database: connected` göstermelidir.

## İlk kullanım

İlk girişte ürün, set ve mevcut yazı şablonu kataloğu bir kez PostgreSQL'e senkronize edilir. Yeni siparişler bundan sonra doğrudan web uygulamasından oluşturulabilir.

## Güvenlik

Demo için varsayılan `admin / Ocean@123` fallback'i kodda vardır; production deploy'da mutlaka `ADMIN_PASSWORD` ve `JWT_SECRET` environment variable olarak değiştirilmelidir. API anahtarları (DHL/SAP) ileride sadece backend environment variables içinde tutulmalıdır; tarayıcı JavaScript'ine yazılmamalıdır.

# Influencer → SAP integration contract

## Implemented (no SAP writes)
- New program orders store source_system=INFLUENCER and business_partner_code (server SAP_INF_CARD_CODE, default 120.9999 from the existing workflow). Legacy records are not backfilled.
- The influencer is a delivery recipient/contact, not a new billing customer. Current order address is a snapshot; editing the address book does not rewrite old orders.
- Current local catalog is queried at search time and validated again on save. Supplied item names are not trusted.
- New line items store set_components at order time (empty array for a normal product). Printing uses that snapshot. Quantity-only edits retain it. Legacy null snapshots retain legacy lookup behavior.
- GET /api/orders/:id/sap-preview is read-only canonical data, with readyForSap=false. It is NOT an SAP request body. No worker sends this to SAP.
- Stable external identity: OCEAN-INF-{order.id}. The eventual SAP adapter must persist receipt identifiers and use lookup-before-retry, including for uncertain timeout results.

## Screen mapping to confirm with SAP team
| Screen meaning | Canonical source | Confirmation needed |
|---|---|---|
| Sipariş Numarası / Sipariş Numarası 2 | source.orderNumber | Which UDO properties, unique key and length constraints |
| Pazaryeri Muhatap Kodu | customer.cardCode | Verify 120.9999 belongs here (not inferred from Trendyol example) |
| Teslimat alıcı / adres / il / ilçe / telefon | delivery fields | SAP geography/address mappings |
| Fatura alıcı / adres / vergi bilgileri | SAP business partner master | Never substitute influencer identity |
| Stok kodu / adı / miktarı | lines | ItemCode validation, UOM, set parent vs exploded components |
| Stok fiyatı / toplam / indirim | SAP commercial rules | Do not assume zero price or 100% discount from screenshot |
| Pazaryeri / remark | INFLUENCER + external reference | Valid configured values |
| Kargo kodu / takip | confirmed DHL shipment | Test numbers must never enter live SAP |
| Sipariş zamanı / oluşturulma zamanı | saved order timestamps | UTC/TR conversion and property types |
| İrsaliye | confirmed SAP delivery response | Document series OKB, warehouse, carrier/driver; verify current values |

## Gates before live
1. Confirm the custom YKTP Entegra Sipariş object's table/UDO and Service Layer metadata or the supported integration endpoint. A screenshot is not a schema.
2. Confirm how the existing processor turns the integration record into a delivery. An Entegra record alone does not guarantee an automatically created delivery. Keep manual waybill fields until this is proven.
3. Decide creation trigger (order approval vs shipment packing). Do not cut deliveries immediately on draft creation; recipient/lines may change.
4. Add persistent outbox and states pending/sending/confirmed/unknown/error; store external DocEntry/DocNum, correlation key and audit records. Retry known failures, reconcile unknown results before resend.
5. Test single product, set, changed qty/address, multi-parcel, cancelled order, duplicate click, timeout and already-created delivery. One commercial delivery per order unless SAP's approved process specifies otherwise; extra DHL parcels must not duplicate it.
6. Obtain one SAP test receipt and one end-to-end delivery reconciliation before enabling live transmission.

## Catalog refresh — deliberately deferred until SQL session
Use a read-only SAP HANA view/query agreed with the SAP team. Obtain ItemCode, ItemName, barcodes, active/frozen flags, UOM and set/BOM parent–component quantities. Confirm BOM type, nested BOM handling and duplicate barcodes before mapping. Do not guess custom tables or write directly to SAP tables.

Import through a staging transaction: validate duplicates, positive quantities, missing components and counts; preview differences; promote the entire validated version atomically. A failed/incomplete fetch must leave the previous catalog intact. Deactivation requires a confirmed complete snapshot, not absence from a partial page. Record source=SAP, source key, sync timestamp and version; lock SAP-owned fields against local overwrite once activated. Preserve historical order snapshots. No SAP SQL connection or automatic refresh has been configured yet.

## Deployment
Existing PostgreSQL data remains in place. New columns/tables use additive IF NOT EXISTS migrations. No historical shipments or orders are queued to SAP. DHL remains sandbox-only.

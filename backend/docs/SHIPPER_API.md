# Shipper API

## Summary

API surface powering the React Native Shipper app, covering assignment, live status updates, location checkpoints, and offline synchronization.

## Routes

- `GET /api/shipper/summary`
- `GET /api/shipper/orders`
- `GET /api/shipper/orders/:orderId`
- `POST /api/shipper/orders/:orderId/status`
- `POST /api/shipper/orders/:orderId/checkpoints`
- `POST /api/shipper/orders/sync`
- `PATCH /api/orders/:orderId/assign-shipper`

## Auth

All `/api/shipper` routes require bearer token with role `shipper`.

## Payloads

### Update Shipping Status

```json
{
  "status": "picked_up",
  "note": "Đã nhận hàng",
  "location": { "lat": 10.76, "lng": 106.66, "accuracy": 12 },
  "clientRequestId": "optional-uuid",
  "occurredAt": "2025-11-21T09:15:00.000Z"
}
```

### Add Checkpoint

```json
{
  "location": { "lat": 10.76, "lng": 106.65 },
  "note": "Qua trạm 2",
  "clientRequestId": "uuid",
  "occurredAt": "2025-11-21T10:00:00.000Z"
}
```

### Sync Offline Updates

```json
{
  "updates": [
    {
      "type": "status",
      "orderId": "<id>",
      "status": "delivering",
      "note": "Khởi hành",
      "clientRequestId": "uuid1",
      "occurredAt": "2025-11-20T12:00:00Z"
    },
    {
      "type": "checkpoint",
      "orderId": "<id>",
      "location": { "lat": 10.7, "lng": 106.7 },
      "note": "Checkin",
      "clientRequestId": "uuid2"
    }
  ]
}
```

### Assign Shipper

`PATCH /api/orders/:orderId/assign-shipper`

```json
{
  "shipperId": "<userId with role shipper>"
}
```

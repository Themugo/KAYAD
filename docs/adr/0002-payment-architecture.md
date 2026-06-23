---
title: 0002 Payment Architecture
owner: @tech-lead
team: architecture
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [architecture]
---
# 0002: Payment Architecture

## Status
Accepted

## Context
The KAYAD platform requires secure payment processing for car purchases through M-Pesa, Kenya's leading mobile money platform. We need to handle:
- Payment initiation via STK push
- Payment callback handling
- Escrow management
- Refund processing
- Transaction reconciliation
- Compliance with regulatory requirements

## Decision
We will implement M-Pesa integration with the following architecture:

### Payment Flow
1. **Payment Initiation**: Buyer initiates payment via M-Pesa STK push
2. **User Confirmation**: User confirms payment on their phone
3. **Callback Handling**: M-Pesa sends callback with transaction status
4. **Escrow Creation**: Funds held in escrow until car delivery
5. **Escrow Release**: Funds released to dealer upon successful delivery
6. **Refund Processing**: Refunds processed if transaction fails or disputed

### Technical Implementation
- **M-Pesa API**: Daraja API (Safaricom)
- **Payment Methods**: STK Push (Lipa na M-Pesa Online)
- **Escrow**: Custom escrow service with MongoDB
- **Webhooks**: Callback endpoint for M-Pesa notifications
- **Idempotency**: Transaction ID to prevent duplicate processing

### Security Measures
- API key and secret encryption
- Transaction signing with M-Pesa credentials
- Webhook signature verification
- Rate limiting on payment endpoints
- Fraud detection and prevention

### Escrow Management
- **Held**: Payment received, awaiting delivery
- **Released**: Funds transferred to dealer
- **Refunded**: Funds returned to buyer
- **Disputed**: Under investigation

## Consequences

### Positive
- M-Pesa is widely used in Kenya (high adoption)
- Real-time payment confirmation
- Built-in fraud detection by M-Pesa
- Escrow protects both buyers and dealers
- Regulatory compliance with CBK requirements

### Negative
- Dependency on M-Pesa infrastructure
- M-Pesa downtime affects platform
- Limited to Kenya market
- Transaction fees apply
- Callback delivery not guaranteed (requires polling)

## Alternatives Considered

### Direct Bank Integration
- **Rejected**: Complex integration with multiple banks
- **Reason**: M-Pesa provides single integration point for most users

### Third-Party Payment Gateways (PayPal, Stripe)
- **Rejected**: Not optimized for Kenyan market
- **Reason**: M-Pesa is the preferred payment method in Kenya

### Cash on Delivery
- **Rejected**: Not feasible for car purchases
- **Reason**: High-value transactions require secure payment methods

## Implementation Notes
- Implement retry logic for failed STK push
- Add polling fallback for missed callbacks
- Store all transactions in MongoDB for reconciliation
- Implement dispute resolution workflow
- Add support for multiple payment methods in future (Card, Bank Transfer)

## References
- [M-Pesa Daraja API Documentation](https://developer.safaricom.co.ke/)
- [Central Bank of Kenya Payment Regulations](https://www.centralbank.go.ke/)

## Related ADRs
- 0001: Authentication Strategy
- 0006: Infrastructure Architecture

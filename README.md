# MoneyHash SDK for Magento 2

Integrates the MoneyHash JavaScript SDK into your Magento 2 checkout.

---

## Requirements

- Magento 2.4.x
- PHP 7.4 or newer

---

## Installation

### 1. Copy the module

```bash
# from your Magento root
git clone https://github.com/MoneyHash/sdk-magento-module.git app/code/MoneyHash/SDK
```

### 2. Enable and deploy

```bash
php bin/magento module:enable MoneyHash_SDK
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento setup:static-content:deploy
php bin/magento cache:clean
php bin/magento cache:flush
```

---

## Configuration

1. Log in to the Admin panel.
2. Go to **Stores** → **Configuration** → **Sales** → **Payment Methods**.
3. Expand **MoneyHash Payment**.
4. Select Enabled **Yes**.
5. Add MoneyHash API endpoint URL that you can get from our docs [here](https://docs.moneyhash.io/reference/payment-intent-v11).
6. Add your account API key that is used for authenticating calls to MoneyHash endpoint.
7. Add your public API key that is used in Web SDK integration.
8. Save Config and flush caches.

> **_NOTE:_** API key and Public API key will be found in MoneyHash dashboard under _Integrations_ > _Account API Keys_.

---

## How It Works

- On checkout, the module loads the MoneyHash SDK from CDN.
- **MoneyHash** UI will be displayed to the customer handling the process of payment.
- Once the SDK completes, the Magento order is created automatically.

---

## Troubleshooting

- **SDK not loading?**
  - Ensure your CSP allows `https://cdn.jsdelivr.net`.
  - Check browser console for 404/CSP errors.

---

## Uninstall

```bash
php bin/magento module:disable MoneyHash_SDK
rm -rf app/code/MoneyHash/SDK
php bin/magento cache:clean
```

---

## License

MIT (see [LICENSE](LICENSE) for details)


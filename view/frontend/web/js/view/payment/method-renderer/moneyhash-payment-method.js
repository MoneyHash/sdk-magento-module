/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

/* @api */
define([
  "Magento_Checkout/js/view/payment/default",
  "Magento_Checkout/js/model/full-screen-loader",
  "Magento_Checkout/js/model/quote",
  "ko",
  "mage/storage",
  "mage/url",
], function (Component, fullScreenLoader, quote, ko, storage, urlBuilder) {
  "use strict";

  return Component.extend({
    defaults: {
      template: "MoneyHash_SDK/payment/moneyhash-payment",
      cardElementsMap: {
        "card-holder-name": {
          elementType: "cardHolderName",
          placeholder: "Card Holder Name",
          validationKey: "card_holder_name",
        },
        "card-number": {
          elementType: "cardNumber",
          placeholder: "Card Number",
          validationKey: "card_number",
        },
        "card-expiry-month": {
          elementType: "cardExpiryMonth",
          placeholder: "MM",
          validationKey: "expiry_month",
        },
        "card-expiry-year": {
          elementType: "cardExpiryYear",
          placeholder: "YY",
          validationKey: "expiry_year",
        },
        "card-cvv": {
          elementType: "cardCvv",
          placeholder: "CVV",
          validationKey: "cvv",
        },
      },
    },

    publicApiKey: ko.observable(""),

    expressMethods: ko.observableArray([]),
    paymentMethods: ko.observableArray([]),

    initialize: function () {
      this._super();
      this.moneyHash = null;
      this.state = null;
      this.stateDetails = null;
      this.intentDetails = null;
      this.selectedMethod = null;

      this.selectMethodHandler = this.selectMethodHandler.bind(this);

      this.initSdk();
    },

    initSdk: async function () {
      if (!window.MoneyHash || !window.MoneyHash.default) {
        console.error("MoneyHash SDK is not loaded.");
        return;
      }

      await this.fetchPublicApiKey();

      const moneyHashPayload = {
        type: "payment",
        ...(this.publicApiKey() ? { publicApiKey: this.publicApiKey() } : {}),
      };
      const HeadlessMoneyHash = window.MoneyHash.default;
      this.moneyHash = new HeadlessMoneyHash(moneyHashPayload);

      this.loadMethods();
    },

    fetchPublicApiKey: async function () {
      const self = this;

      const serviceUrl = urlBuilder.build("public_key_fetcher/api/get");

      return storage
        .get(serviceUrl)
        .done(function (response) {
          if (response.success && response.secret) {
            self.publicApiKey(response.secret);
          } else {
            self.publicApiKey("");
          }
        })
        .fail(function () {
          self.publicApiKey("");
        });
    },

    createIntent: async function () {
      const serviceUrl = urlBuilder.build("create_intent/api/createintent");
      const orderItems = quote.getItems().map((item) => ({
        name: item.name,
        description: item.description || item.name,
        amount: Number(item.price),
        quantity: item.qty,
      }));
      const shipping = quote.shippingAddress();
      const shippingMethod = quote.shippingMethod();
      const billing = quote.billingAddress();

      try {
        fullScreenLoader.startLoader();

        const response = await storage.post(
          serviceUrl,
          JSON.stringify({
            amount: orderItems.reduce((sum, item) => sum + item.amount * item.quantity, 0),
            amount_currency: "SAR", // replace with currency driven from magento info using `quote.totals()?.base_currency_code`
            operation: "purchase", // or "authorize"
            webhook_url: "https://example.webhook.url", // replace with your actual webhook URL

            billing_data: {
              first_name: billing.firstname,
              last_name: billing.lastname,
              email: billing.email,
              phone_number: billing.telephone,
              address: billing.getAddressInline(),
              city: billing.city,
              state: billing.region,
              postal_code: billing.postcode,
            },
            shipping_data: {
              address: shipping.getAddressInline(),
              city: shipping.city,
              state: shipping.region,
              postal_code: shipping.postcode,
              first_name: shipping.firstname,
              last_name: shipping.lastname,
              phone_number: shipping.telephone,
              shipping_method: shippingMethod.method_code,
              email: shipping.email,
              apartment: "803",
              building: "8028",
              description: "Second building",
              country: shipping.countryId,
              street: shipping.street.join(", "),
              floor: 1,
            },
            product_items: orderItems,
          })
        );

        const { data } = response;
        const intent = data.data;

        this.intentDetails = intent;
      } catch (error) {
        console.error("Error creating intent:", error);
      } finally {
        fullScreenLoader.stopLoader();
      }
    },

    loadMethods: async function () {
      try {
        fullScreenLoader.startLoader();

        const currencyCode = "SAR"; // quote.totals()?.base_currency_code;

        const { expressMethods, paymentMethods } = await this.getMethods({ currency: currencyCode });

        this.expressMethods(expressMethods);
        this.paymentMethods(paymentMethods);

        this.manageShownContent("methods");
      } catch (error) {
        console.error("Failed to load methods:", error);
        alert("Failed to load methods. Check console for details.");
      } finally {
        fullScreenLoader.stopLoader();
      }
    },

    loadIntent: async function () {
      const intentId = document.getElementById("intent-id-input").value.trim();

      if (!intentId) {
        alert("Please enter a valid Intent ID.");
        return;
      }

      try {
        fullScreenLoader.startLoader();

        console.log("Loading intent:", intentId);
        const response = await this.getIntentDetails(intentId);
        console.log("Intent loaded successfully:", response);

        this.updateInstanceState(response);
      } catch (error) {
        console.error("Failed to load intent:", error);
        alert("Failed to load intent. Check console for details.");
      } finally {
        fullScreenLoader.stopLoader();
      }
    },

    updateInstanceState: function (response) {
      this.state = response.state;
      this.stateDetails = response.stateDetails;
      this.intentDetails = response.intent;
      this.selectedMethod = response.selectedMethod;

      this.renderStateAction();
    },

    renderStateAction: function () {
      switch (this.state) {
        case "METHOD_SELECTION":
          this.displayPaymentMethods();
          break;
        case "FORM_FIELDS":
          if (this.stateDetails?.formFields?.card?.accessToken) {
            this.displayCardForm();
            return;
          }
          alert("Unhandled FORM_FIELDS case");
          break;
        case "INTENT_PROCESSED":
        case "INTENT_UNPROCESSED":
        case "TRANSACTION_FAILED":
          this.showIntentStatus();
          break;
        default:
          alert("Unhandled state: " + this.state);
      }
    },

    displayPaymentMethods: async function () {
      try {
        fullScreenLoader.startLoader();

        const { expressMethods, paymentMethods } = await this.getIntentMethods(this.intentDetails.id);

        this.expressMethods(expressMethods);
        this.paymentMethods(paymentMethods);

        this.manageShownContent("methods");
      } catch (error) {
        console.error("Error displaying methods:", error);
      } finally {
        fullScreenLoader.stopLoader();
      }
    },

    manageShownContent: function (contentId) {
      const contents = document.querySelectorAll(".mh-content");
      contents.forEach((content) => {
        content.classList.add("hidden");
      });

      const activeContent = document.getElementById(contentId);
      if (activeContent) {
        activeContent.classList.remove("hidden");
      } else {
        console.warn(`Content with ID ${contentId} not found.`);
      }
    },

    selectMethodHandler: async function ({ id }) {
      console.log(`Selected method: ${id}`);

      if (!this.intentDetails) {
        await this.createIntent();
      }

      try {
        fullScreenLoader.startLoader();

        const response = await this.selectMethod({
          methodId: id,
          intentId: this.intentDetails.id,
        });

        this.updateInstanceState(response);
      } catch (error) {
        console.error("Failed to select method:", error);
      } finally {
        fullScreenLoader.stopLoader();
      }
    },

    displayCardForm: async function () {
      await this.createCardFromElements();

      this.manageShownContent("card-form");
    },

    submitForm: async function () {
      try {
        fullScreenLoader.startLoader();

        this.resetCardFormErrors();

        const response = await this.submitCardForm();

        this.updateInstanceState(response);
      } catch (error) {
        console.error("Error submitting form:", error);
        this.renderCardFormErrors(error);
      } finally {
        fullScreenLoader.stopLoader();
      }
    },

    resetCardFormErrors: function () {
      Object.keys(this.cardElementsMap).forEach((field) => {
        const errorElement = document.getElementById(`${field}-error`);
        errorElement.textContent = "error";
        errorElement.classList.add("invisible");
      });
    },

    renderCardFormErrors: function (errors) {
      Object.keys(this.cardElementsMap).forEach((field) => {
        const errorElement = document.getElementById(`${field}-error`);
        const fieldValidationKey = this.cardElementsMap[field].validationKey;
        if (errors[fieldValidationKey]) {
          errorElement.textContent = errors[fieldValidationKey];
          errorElement.classList.remove("invisible");
        } else {
          errorElement.textContent = "error";
          errorElement.classList.add("invisible");
        }
      });
    },

    showIntentStatus: function () {
      const intentStatus = this.intentDetails.status;

      const intentStatusMessage = document.getElementById("intent-status-message");
      console.log("rendering state action");

      switch (intentStatus) {
        case "PROCESSED":
          intentStatusMessage.textContent = "Payment processed successfully!";

          this.placeOrder();
          break;
        case "UNPROCESSED":
          intentStatusMessage.textContent = "Payment is failed.";
          break;
        default:
          intentStatusMessage.textContent = "Unknown intent status.";
      }

      this.manageShownContent("intent-status");
    },

    getData: function () {
      const data = this._super();

      const additional_data = {
        moneyhash_pay_data: JSON.stringify({
          selectedMethod: this.selectedMethod,
          intentId: this.intentDetails?.id,
        }),
      };

      data.additional_data = additional_data || {};

      return data;
    },

    // MoneyHash SDK methods
    getIntentDetails: async function (intentId) {
      try {
        return await this.moneyHash.getIntentDetails(intentId);
      } catch (error) {
        console.error("Error fetching intent details:", error);
        throw error;
      }
    },

    getMethods: async function (payload) {
      try {
        return await this.moneyHash.getMethods(payload);
      } catch (error) {
        console.error("Error fetching methods:", error);
        throw error;
      }
    },

    getIntentMethods: async function (intentId) {
      try {
        return await this.moneyHash.getIntentMethods(intentId);
      } catch (error) {
        console.error("Error fetching methods:", error);
        throw error;
      }
    },

    selectMethod: async function ({ methodId, intentId }) {
      try {
        return await this.moneyHash.proceedWith({
          type: "method",
          id: methodId,
          intentId,
        });
      } catch (error) {
        console.error("Error selecting method:", error);
        throw error;
      }
    },

    createCardFromElements: async function () {
      const elements = await this.moneyHash.elements({
        styles: {
          color: {
            error: "#f00",
          },
          placeholderColor: "grey",
          height: "40px",
          padding: "8px",
        },
      });

      Object.keys(this.cardElementsMap).forEach((selector) => {
        const config = this.cardElementsMap[selector];
        elements
          .create({
            elementType: config.elementType,
            elementOptions: {
              selector: `#${selector}`,
              placeholder: config.placeholder,
            },
          })
          .mount();
      });
    },

    submitCardForm: async function () {
      try {
        const cardData = await this.moneyHash.submitForm({
          intentId: this.intentDetails.id,
          accessToken: this.stateDetails?.formFields?.card?.accessToken,
          billingData: {}, //this.intentDetails.billingData,
          shippingData: {}, //this.intentDetails.shippingData,
        });
        console.log("Card data submitted successfully:", cardData);
        return cardData;
      } catch (error) {
        console.error("Error submitting form:", error);
        throw error;
      }
    },
  });
});


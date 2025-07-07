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
], function (Component, fullScreenLoader, quote, ko) {
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

        getShippingAddress: function () {
            return quote.shippingAddress() ?? "";
        },

        getExpressMethods: function () {
            return this.expressMethods;
        },

        getPaymentMethods: function () {
            return this.paymentMethods;
        },

        initialize: function () {
            this._super();
            this.moneyHash = null;
            this.state = null;
            this.stateDetails = null;
            this.intentDetails = null;

            this.expressMethods = ko.observableArray([]);
            this.paymentMethods = ko.observableArray([]);

            this.selectMethodHandler = this.selectMethodHandler.bind(this);

            this.initSdk();
        },

        initSdk: function () {
            if (!window.MoneyHash || !window.MoneyHash.default) {
                console.error("MoneyHash SDK is not loaded.");
                return;
            }

            const HeadlessMoneyHash = window.MoneyHash.default;
            this.moneyHash = new HeadlessMoneyHash({
                type: "payment",
            });
        },

        loadIntent: async function () {
            const intentId = document
                .getElementById("intent-id-input")
                .value.trim();

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

                const { expressMethods, paymentMethods } =
                    await this.getIntentMethods(this.intentDetails.id);

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
                const fieldValidationKey =
                    this.cardElementsMap[field].validationKey;
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

            const intentStatusMessage = document.getElementById(
                "intent-status-message"
            );
            console.log("rendering state action");

            switch (intentStatus) {
                case "PROCESSED":
                    intentStatusMessage.textContent =
                        "Payment processed successfully!";

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

        // MoneyHash SDK methods
        getIntentDetails: async function (intentId) {
            try {
                return await this.moneyHash.getIntentDetails(intentId);
            } catch (error) {
                console.error("Error fetching intent details:", error);
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
                    accessToken:
                        this.stateDetails?.formFields?.card?.accessToken,
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

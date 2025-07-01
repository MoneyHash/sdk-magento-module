/**
 * This is the core KnockoutJS view model for our payment method.
 * It controls the rendering and behavior on the frontend.
 */
define([
    "jquery",
    "Magento_Checkout/js/view/payment/default",
    "Magento_Checkout/js/action/place-order",
    "Magento_Checkout/js/model/payment/additional-validators",
    "mage/url",
    "Magento_Checkout/js/model/quote",
], function ($, Component, placeOrderAction, additionalValidators, url, quote) {
    "use strict";

    return Component.extend({
        defaults: {
            template: "MHCheckout_SDK/payment/sdk-form",
            // Define our method code as a fallback. Ensure this matches your etc/config.xml
            paymentMethodCode: "mhcheckout_sdk",
            // Define our title as a fallback
            paymentMethodTitle: "Secure Payment via MH SDK",
        },

        /**
         * Initializes the component.
         */
        initialize: function (config) {
            this._super(config);
            // We will initialize the SDK once the component is rendered.
            // See the 'initSdk' function below.

            // Add a debug log to check if the item data is present
            if (!this.item) {
                console.warn(
                    "MHCheckout_SDK: Payment method item data not found in component config. Using defaults."
                );
            }
            return this;
        },

        /**
         * Get payment method code.
         * Overriding the parent method to avoid dependency on `this.item`, which may not be ready.
         * @returns {String}
         */
        getCode: function () {
            return this.item ? this.item.method : this.paymentMethodCode;
        },

        /**
         * Get payment method title.
         * Overriding the parent method to provide a fallback.
         * @returns {String}
         */
        getTitle: function () {
            return this.item ? this.item.title : this.paymentMethodTitle;
        },

        /**
         * This function will be called from our HTML template after it has been rendered.
         * This is the main entry point to initialize your SDK.
         */
        initSdk: function () {
            console.log(window.MoneyHash);
            // Check if your SDK's global object exists
            if (typeof MoneyHash === "undefined") {
                console.error("MoneyHash SDK is not loaded!");
                return;
            }

            console.log("Initializing Custom Checkout SDK...");

            // Get the container element for your SDK's UI
            const sdkContainer = document.getElementById("mh-sdk-container");
            if (!sdkContainer) return;

            // --- YOUR SDK INTEGRATION LOGIC GOES HERE ---
            // Example:
            // const sdk = MoneyHash.default.init({
            //     apiKey: 'YOUR_API_KEY',
            //     container: sdkContainer,
            //     // This is a callback function that your SDK would call
            //     // when the payment is successfully processed.
            //     onPaymentSuccess: function(paymentResult) {
            //         console.log('SDK Payment Success:', paymentResult);
            //         // Now, place the Magento order
            //         this.placeMagentoOrder(paymentResult);
            //     }.bind(this)
            // });

            // For demonstration, we'll just add some text.
            sdkContainer.innerHTML =
                '<h2>Custom Checkout SDK Loaded</h2><p>Your SDK would render its UI here.</p><button id="sdk-pay-button" class="action primary">Pay with SDK</button>';

            // You would replace this with your SDK's own "Pay" button event
            $("#sdk-pay-button").on(
                "click",
                function () {
                    alert(
                        "SDK is processing payment... now placing Magento order."
                    );
                    // In a real scenario, your SDK's onPaymentSuccess callback would trigger this.
                    // this.placeMagentoOrder({ transactionId: "12345-ABCDE" });
                }.bind(this)
            );
        },

        /**
         * This function is called after your SDK has successfully processed the payment.
         * It collects the necessary data and calls Magento's backend to create the order.
         *
         * @param {object} paymentResult - The success object from your SDK.
         */
        placeMagentoOrder: function (paymentResult) {
            console.log({ paymentResult });
            // if (additionalValidators.validate()) {
            // Add any data from your SDK's result to the payment payload.
            // This data will be available in your backend payment model.
            // this.paymentMethodAdditionalData.transaction_id =
            //     paymentResult.transactionId;

            // Use the standard Magento place order action.
            // placeOrderAction(this.getData(), this.messageContainer)
            //     .done(function () {
            //         // Redirect to the success page
            //         window.location.replace(
            //             url.build("checkout/onepage/success")
            //         );
            //     })
            //     .fail(function (response) {
            //         // Handle errors (e.g., display a message)
            //         console.error("Error placing Magento order:", response);
            //     });
            // }
        },
    });
});

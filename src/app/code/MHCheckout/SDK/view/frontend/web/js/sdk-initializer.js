/**
 * This component's only purpose is to find the container div
 * and initialize the MoneyHash SDK within it.
 */
define([
    "jquery",
    "Magento_Checkout/js/model/quote",
    "Magento_Checkout/js/model/url-builder",
    "mage/storage",
    "Magento_Checkout/js/action/place-order",
], function ($, quote, urlBuilder, storage, placeOrderAction) {
    "use strict";

    // This function is called by the x-magento-init script in our template.
    return function (config, element) {
        console.log("MH SDK Initializer component loaded.");

        const cardElementsMap = {
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
        };

        class MoneyHashSDK {
            constructor() {
                const HeadlessMoneyHash = window.MoneyHash.default;
                this.moneyHash = new HeadlessMoneyHash({
                    type: "payment",
                });
                this.state = null;
                this.stateDetails = null;
                this.intentDetails = null;
            }

            updateInstanceState(response) {
                const { state, stateDetails, intent } = response;
                this.updateState({ state, stateDetails });
                this.updateIntentDetails(intent);
            }

            updateState({ state, stateDetails }) {
                this.state = state;
                this.stateDetails = stateDetails;
                console.log("State updated:", this.state);
                console.log("State details updated:", this.stateDetails);
            }

            updateIntentDetails(intent) {
                this.intentDetails = intent;
                console.log("Intent details updated:", this.intentDetails);
            }

            async getIntentDetails(intentId) {
                if (!intentId) {
                    throw new Error("Intent ID is required");
                }

                try {
                    const response = await this.moneyHash.getIntentDetails(
                        intentId
                    );
                    console.log(
                        "Intent details fetched successfully:",
                        response
                    );
                    this.updateInstanceState(response);
                } catch (error) {
                    console.error("Error fetching intent details:", error);
                    throw error;
                }
            }

            async getIntentMethods(intentId) {
                if (!intentId) {
                    throw new Error("Intent ID is required");
                }

                try {
                    const { expressMethods, paymentMethods } =
                        await this.moneyHash.getIntentMethods(intentId);
                    return { expressMethods, paymentMethods };
                } catch (error) {
                    console.error("Error fetching intent methods:", error);
                    throw error;
                }
            }

            async selectMethod({ methodId, intentId }) {
                if (!methodId || !intentId) {
                    throw new Error("Method ID and Intent ID are required");
                }

                try {
                    const response = await this.moneyHash.proceedWith({
                        intentId,
                        type: "method",
                        id: methodId,
                    });
                    console.log("Method selected successfully:", response);

                    this.updateInstanceState(response);
                } catch (error) {
                    console.error("Error selecting method:", error);
                    throw error;
                }
            }

            async createCardForm({ styles, elementsSelectors }) {
                const elements = await this.moneyHash.elements({
                    styles,
                });

                const cardFormElements = elementsSelectors.map((selector) => {
                    return elements.create({
                        elementType: cardElementsMap[selector].elementType,
                        elementOptions: {
                            selector: `#${selector}`,
                            // height: "80px",
                            placeholder: cardElementsMap[selector].placeholder,
                            styles: {
                                // color: "red",
                                // backgroundColor: "black", // background color of the input
                                // placeholderColor: "#ccc", // placeholder color
                            },
                        },
                    });
                });

                cardFormElements.forEach((element) => {
                    element.mount();
                    console.log("Mounted element:", element);
                });
            }

            async submitForm() {
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
            }
        }

        class UIService {
            constructor(mhInstance) {
                this.mhInstance = mhInstance;
            }

            init() {
                this.bindLoadIntentEvent();
            }

            bindLoadIntentEvent() {
                const loadIntentButton =
                    document.getElementById("load-intent-button");
                loadIntentButton.onclick = async () => {
                    const intentId = document
                        .getElementById("intent-id-input")
                        .value.trim();

                    if (!intentId) {
                        alert("Please enter a valid Intent ID.");
                        return;
                    }

                    console.log("Loading intent:", intentId);
                    try {
                        this.setLoader(loadIntentButton, true);
                        await this.mhInstance.getIntentDetails(intentId);
                        this.renderStateAction();
                    } catch (error) {
                        console.error("Failed to load intent:", error);
                        alert(
                            "Failed to load intent. Check console for details."
                        );
                    } finally {
                        this.setLoader(loadIntentButton, false, "Load Intent");
                    }
                };
            }

            setLoader(element, isLoading, originalText) {
                element.disabled = isLoading;
                element.innerHTML = isLoading
                    ? `<div role="status" aria-label="Loading…" class="w-5 h-5 border-4 border-gray border-t-transparent rounded-full animate-spin"></div>`
                    : originalText;
                element.classList.toggle("cursor-wait", isLoading);
            }

            async displayIntentMethods(intentId) {
                try {
                    const { expressMethods, paymentMethods } =
                        await this.mhInstance.getIntentMethods(intentId);
                    console.log("Express Methods:", expressMethods);
                    console.log("Payment Methods:", paymentMethods);

                    this.renderExpressMethods(intentId, expressMethods);
                    this.renderPaymentMethods(intentId, paymentMethods);
                    this.manageShownContent("methods");
                } catch (error) {
                    console.error("Failed to display intent methods:", error);
                }
            }

            async selectMethodHandler(methodId, intentId) {
                console.log(`Selected method: ${methodId}`);
                const methodsContainer = document.getElementById("methods");

                try {
                    methodsContainer.classList.toggle("cursor-wait", true);

                    await this.mhInstance.selectMethod({
                        methodId,
                        intentId,
                    });

                    this.renderStateAction();
                } catch (error) {
                    console.error("Failed to select method:", error);
                } finally {
                    methodsContainer.classList.toggle("cursor-wait", true);
                }
            }

            renderExpressMethods(intentId, expressMethods) {
                const container = document.getElementById("express-methods");
                expressMethods.forEach((method) => {
                    const methodElement = document.createElement("button");
                    methodElement.textContent = `Pay with ${method.title}`;
                    methodElement.classList.add(
                        "cursor-pointer",
                        "flex",
                        "justify-center",
                        "items-center",
                        "w-full",
                        "p-2",
                        "border",
                        "border-gray-300",
                        "rounded"
                    );
                    methodElement.onclick = this.selectMethodHandler.bind(
                        this,
                        method.id,
                        intentId
                    );
                    container.appendChild(methodElement);
                });
            }

            renderPaymentMethods(intentId, paymentMethods) {
                const container = document.getElementById("payment-methods");
                paymentMethods.forEach((method) => {
                    const methodElement = document.createElement("button");
                    methodElement.innerHTML = `
              <img src="${method.icons[0]}" alt="${method.title} icon" class="w-8 mr-2" />
              <span>${method.title}</span>
            `;
                    methodElement.classList.add(
                        "!flex",
                        "items-center",
                        "justify-start",
                        "w-full",
                        "p-2",
                        "border",
                        "border-gray-300",
                        "rounded",
                        "cursor-pointer",
                        "mb-2"
                    );
                    methodElement.onclick = this.selectMethodHandler.bind(
                        this,
                        method.id,
                        intentId
                    );

                    container.appendChild(methodElement);
                });
            }

            renderStateAction() {
                const intentDetails = this.mhInstance.intentDetails;
                const state = this.mhInstance.state;
                const stateDetails = this.mhInstance.stateDetails;

                switch (state) {
                    case "METHOD_SELECTION":
                        this.displayIntentMethods(intentDetails.id);
                        break;
                    case "FORM_FIELDS":
                        if (
                            stateDetails &&
                            !!stateDetails.formFields?.card?.accessToken
                        ) {
                            this.renderCardForm();
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
                        alert("Unhandled state: " + state);
                }
            }

            renderCardForm() {
                this.mhInstance.createCardForm({
                    styles: {
                        color: {
                            // base: "#00f",
                            error: "#f00",
                        },
                        placeholderColor: "grey",
                        height: "40px",
                        padding: "8px",
                    },
                    elementsSelectors: Object.keys(cardElementsMap),
                });

                const submitButton = document.getElementById("submit-button");
                submitButton.onclick = async () => {
                    try {
                        this.setLoader(submitButton, true);
                        this.resetCardFormErrors();
                        const cardData = await this.mhInstance.submitForm();

                        this.placeMagentoOrder(cardData);
                        this.mhInstance.updateInstanceState(cardData);
                        this.renderStateAction();
                    } catch (error) {
                        this.renderCardFormErrors(error);
                        this.setLoader(submitButton, false, "Submit");
                    }
                };

                this.manageShownContent("card-form");
            }

            placeMagentoOrder(paymentResult) {
                console.log({ paymentResult });

                // Add any data from your SDK's result to the payment payload.
                // This data will be available in your backend payment model.
                // this.paymentMethodAdditionalData.transaction_id =
                //     paymentResult.transactionId;

                // const payload = {
                //     // cartId: window.checkoutConfig.quoteData.entity_id,
                //     method: "cashondelivery",
                //     additional_data: {
                //         transaction_id: paymentResult.intent.id,
                //     },
                // };

                // // Use the standard Magento place order action.
                // placeOrderAction(payload)
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
            }

            resetCardFormErrors() {
                Object.keys(cardElementsMap).forEach((field) => {
                    const errorElement = document.getElementById(
                        `${field}-error`
                    );
                    errorElement.textContent = "error";
                    errorElement.classList.add("invisible");
                });
            }

            renderCardFormErrors(errors) {
                Object.keys(cardElementsMap).forEach((field) => {
                    const errorElement = document.getElementById(
                        `${field}-error`
                    );
                    const fieldValidationKey =
                        cardElementsMap[field].validationKey;
                    if (errors[fieldValidationKey]) {
                        errorElement.textContent = errors[fieldValidationKey];
                        errorElement.classList.remove("invisible");
                    } else {
                        errorElement.textContent = "error";
                        errorElement.classList.add("invisible");
                    }
                });
            }

            showIntentStatus() {
                const intentStatus = this.mhInstance.intentDetails.status;
                const intentStatusIcon =
                    document.getElementById("intent-status-icon");
                const intentStatusMessage = document.getElementById(
                    "intent-status-message"
                );
                console.log("rendering state action");

                switch (intentStatus) {
                    case "PROCESSED":
                        intentStatusMessage.textContent =
                            "Payment processed successfully!";
                        intentStatusMessage.classList.add("text-green-500");
                        intentStatusIcon.setAttribute(
                            "src",
                            "https://png.pngtree.com/png-clipart/20210321/original/pngtree-green-check-mark-icon-design-template-vector-png-image_6109371.jpg"
                        );
                        // intentStatusIcon.classList.add("text-green-500");
                        break;
                    case "UNPROCESSED":
                        intentStatusMessage.textContent = "Payment is failed.";
                        intentStatusMessage.classList.add("text-red-500");
                        intentStatusIcon.setAttribute(
                            "src",
                            "https://images.vexels.com/media/users/3/340644/isolated/preview/e582116e90ff33f47a38ba20aaf82ecc-red-x-in-a-circle.png"
                        );
                        // intentStatusIcon.classList.add("text-red-500");
                        break;
                    default:
                        intentStatusMessage.textContent =
                            "Unknown intent status.";
                    // intentStatusIcon.setAttribute("data-feather", "help-circle");
                }

                this.manageShownContent("intent-status");
            }

            manageShownContent(contentId) {
                const contents = document.querySelectorAll(".content");
                contents.forEach((content) => {
                    content.classList.add("hidden");
                });

                const activeContent = document.getElementById(contentId);
                if (activeContent) {
                    activeContent.classList.remove("hidden");
                } else {
                    console.warn(`Content with ID ${contentId} not found.`);
                }
            }
        }

        // Wait for the document to be ready to ensure all elements are available.
        $(document).ready(function () {
            const sdk = new MoneyHashSDK();
            const uiService = new UIService(sdk);
            uiService.init();
        });
    };
});

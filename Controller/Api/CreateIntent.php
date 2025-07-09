<?php

namespace MoneyHash\SDK\Controller\Api;

use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\App\Response\Http\FileFactory;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\HTTP\Client\Curl;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Encryption\EncryptorInterface;
use Psr\Log\LoggerInterface;

/**
 * This controller acts as a proxy to an moneyhash external API.
 */
class CreateIntent extends Action
{
  /**
   * The endpoint URL for the external service.
   * It's best practice to store this in configuration.
   */
  const XML_PATH_MONEYHASH_API_ENDPOINT = 'payment/moneyhashpayment/moneyhash_api_endpoint';
  const XML_PATH_MONEYHASH_API_KEY = 'payment/moneyhashpayment/moneyhash_api_key';


  /**
   * @var JsonFactory
   */
  protected $resultJsonFactory;

  /**
   * @var Curl
   */
  protected $curl;

  /**
   * @var ScopeConfigInterface
   */
  protected $scopeConfig;

  /**
   * @var LoggerInterface
   */
  protected $logger;

  /**
   * @var EncryptorInterface
   */
  protected $encryptor;


  /**
   * @param Context $context
   * @param JsonFactory $resultJsonFactory
   * @param Curl $curl
   * @param ScopeConfigInterface $scopeConfig
   * @param LoggerInterface $logger
   * @param EncryptorInterface $encryptor
   */
  public function __construct(
    Context $context,
    JsonFactory $resultJsonFactory,
    Curl $curl,
    ScopeConfigInterface $scopeConfig,
    LoggerInterface $logger,
    EncryptorInterface $encryptor
  ) {
    parent::__construct($context);
    $this->resultJsonFactory = $resultJsonFactory;
    $this->curl = $curl;
    $this->scopeConfig = $scopeConfig;
    $this->logger = $logger;
    $this->encryptor = $encryptor;
  }

  /**
   * The main entry point for the controller.
   *
   * @return \Magento\Framework\Controller\Result\Json
   */
  public function execute()
  {
    $result = $this->resultJsonFactory->create();
    $responsePayload = [];

    try {
      // 1. Get data sent from the Knockout component
      $requestBody = $this->getRequest()->getContent();
      $requestData = json_decode($requestBody, true);

      // Basic validation
      if (empty($requestData) || !isset($requestData['amount']) || !isset($requestData['amount_currency']) || !isset($requestData['webhook_url'])) {
        throw new \Exception('Invalid request data.');
      }

      // 2. Prepare the request to the external API
      $apiUrl = $this->scopeConfig->getValue(self::XML_PATH_MONEYHASH_API_ENDPOINT) . "payments/intent/";
      $encryptedApiKey = $this->scopeConfig->getValue(self::XML_PATH_MONEYHASH_API_KEY);
      $apiKey = $this->encryptor->decrypt($encryptedApiKey);

      if (!$apiUrl || !$apiKey) {
        throw new \Exception('External API is not configured.');
      }

      // Example: Set authorization headers and content type
      $headers = [
        "x-api-key" => $apiKey,
        "Content-Type" => "application/json"
      ];
      $this->curl->setHeaders($headers);

      // 3. Make the POST request to the external API
      // We'll send the data we got from Knockout.
      $this->curl->post($apiUrl, json_encode($requestData));

      // 4. Process the response from the external API
      $apiResponse = $this->curl->getBody();
      $apiStatusCode = $this->curl->getStatus();


      if ($apiStatusCode == 201 || $apiStatusCode == 200) { // 201 Created or 200 OK
        $responsePayload = [
          'success' => true,
          'message' => __('Resource created successfully.'),
          'data' => json_decode($apiResponse, true) // Pass the external API's response back to the frontend
        ];
      } else {
        throw new \Exception("External API returned an error (Status: {$apiStatusCode}). Response: {$apiResponse}");
      }

    } catch (\Exception $e) {
      $this->logger->critical('Error in CreateIntent controller: ' . $e->getMessage());
      $responsePayload = [
        'success' => false,
        'message' => __('An error occurred: %1', $e->getMessage())
      ];
      $result->setHttpResponseCode(400); // Bad Request
    }

    // 5. Send the final JSON response back to the Knockout component
    return $result->setData($responsePayload);
  }
}

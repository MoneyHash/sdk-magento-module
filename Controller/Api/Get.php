<?php

namespace MoneyHash\SDK\Controller\Api;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Framework\Encryption\EncryptorInterface;


class Get implements HttpGetActionInterface
{
  protected $jsonFactory;
  protected $scopeConfig;
  protected $encryptor;

  public function __construct(
    JsonFactory $jsonFactory,
    ScopeConfigInterface $scopeConfig,
    EncryptorInterface $encryptor
  ) {
    $this->jsonFactory = $jsonFactory;
    $this->scopeConfig = $scopeConfig;
    $this->encryptor = $encryptor;
  }

  public function execute()
  {
    $resultJson = $this->jsonFactory->create();
    try {
      $encryptedValue = $this->scopeConfig->getValue(
        'payment/moneyhashpayment/public_api_key', // Path from system.xml
        ScopeInterface::SCOPE_STORE
      );
      $secretValue = $this->encryptor->decrypt($encryptedValue);
      return $resultJson->setData(['success' => true, 'secret' => $secretValue]);
    } catch (\Exception $e) {
      return $resultJson->setHttpResponseCode(500)->setData(['success' => false, 'message' => $e->getMessage()]);
    }
  }
}
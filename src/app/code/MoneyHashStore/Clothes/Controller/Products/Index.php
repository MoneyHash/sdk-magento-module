<?php

namespace MoneyHashStore\Clothes\Controller\Products;

use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;

class Index extends Action
{
  /**
   * @var PageFactory
   */
  protected $resultPageFactory;

  /**
   * @param Context $context
   * @param PageFactory $resultPageFactory
   */
  public function __construct(
    Context $context,
    PageFactory $resultPageFactory
  ) {
    $this->resultPageFactory = $resultPageFactory;
    parent::__construct($context);
  }

  /**
   * Renders the product listing page.
   *
   * @return \Magento\Framework\Controller\ResultInterface
   */
  public function execute()
  {
    $resultPage = $this->resultPageFactory->create();
    $resultPage->getConfig()->getTitle()->set(__('Clothes Products'));
    return $resultPage;
  }
}

import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Container } from "@medusajs/ui";
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { sdk } from "../lib/config";

type Product = {
  id: string;
  title: string;
  handle: string;
  metadata?: Record<string, any> | null;
};

type Collection = {
  id: string;
  title: string;
  handle: string;
};

type Quicklink = {
  title: string;
  link: string;
  type: 'custom' | 'product' | 'collection';
};

const QuicklinksManager = () => {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quicklinks, setQuicklinks] = useState<Quicklink[]>([]);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [linkType, setLinkType] = useState<'custom' | 'product' | 'collection'>('custom');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [, setIsLoadingProducts] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get product ID from URL
  const getProductId = () => {
    const parts = window.location.pathname.split('/');
    const productIndex = parts.findIndex(part => part === 'products');
    return productIndex !== -1 ? parts[productIndex + 1] : null;
  };

  // Load current product and its quicklinks
  useEffect(() => {
    const productId = getProductId();
    if (!productId) return;

    const loadProduct = async () => {
      try {
        const { product } = await sdk.admin.product.retrieve(productId);
        setCurrentProduct(product);
        
        // Parse quicklinks from metadata
        if (product?.metadata?.quicklinks) {
          try {
            const parsedQuicklinks = JSON.parse(product.metadata.quicklinks as string);
            setQuicklinks(Array.isArray(parsedQuicklinks) ? parsedQuicklinks : []);
          } catch (e) {
            console.error("Error parsing quicklinks:", e);
            setQuicklinks([]);
          }
        }
      } catch (error) {
        console.error("Error loading product:", error);
      }
    };

    loadProduct();
  }, []);

  // Load available products for linking
  const loadAvailableProducts = async (search?: string) => {
    setIsLoadingProducts(true);
    try {
      const { products } = await sdk.admin.product.list({
        limit: 50,
        q: search
      });
      setAvailableProducts(products);
    } catch (error) {
      console.error("Error loading available products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Load collections
  const loadCollections = async (search?: string) => {
    setIsLoadingCollections(true);
    try {
      const { collections } = await sdk.admin.productCollection.list({
        limit: 50,
        q: search
      });
      setCollections(collections);
    } catch (error) {
      console.error("Error loading collections:", error);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => {
    if (linkType === 'product') {
      const timer = setTimeout(() => {
        loadAvailableProducts(productSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [linkType, productSearchTerm]);

  useEffect(() => {
    if (linkType === 'collection') {
      const timer = setTimeout(() => {
        loadCollections(collectionSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [linkType, collectionSearchTerm]);

  const updateProductMetadata = async (updatedQuicklinks: Quicklink[]) => {
    if (!currentProduct?.id) return false;
    
    setIsSaving(true);
    try {
      // Get latest product data first
      const { product: latest } = await sdk.admin.product.retrieve(currentProduct.id);
      
      // Update the product with new quicklinks
      await sdk.admin.product.update(currentProduct.id, {
        metadata: {
          ...latest.metadata,
          quicklinks: JSON.stringify(updatedQuicklinks)
        }
      });
      return true;
    } catch (error) {
      console.error("Error updating quicklinks:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuicklink = async () => {
    if (!link.trim() || (linkType === 'custom' && !title.trim())) return;

    const newQuicklink: Quicklink = {
      title: title || link,
      link: link.trim(),
      type: linkType
    };

    const updatedQuicklinks = [...quicklinks, newQuicklink];
    const success = await updateProductMetadata(updatedQuicklinks);
    
    if (success) {
      setQuicklinks(updatedQuicklinks);
      setTitle('');
      setLink('');
      setLinkType('custom');
    }
  };

  const handleRemoveQuicklink = async (index: number) => {
    const updatedQuicklinks = quicklinks.filter((_, i) => i !== index);
    const success = await updateProductMetadata(updatedQuicklinks);
    
    if (success) {
      setQuicklinks(updatedQuicklinks);
    }
  };

  if (!currentProduct) return null;

  return (
    <Container>
      <h3 className="text-lg font-medium mb-4">
        Quicklinks
      </h3>
      
      <div className="space-y-4">
        {quicklinks.map((quicklink, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded">
            <div className="flex flex-col">
              <span className="font-medium">{quicklink.title}</span>
              <span className="text-ui-fg-subtle">
                {quicklink.type.charAt(0).toUpperCase() + quicklink.type.slice(1)}
                {quicklink.type === 'custom' && `: ${quicklink.link}`}
              </span>
            </div>
            <Button
              variant="danger"
              size="base"
              onClick={() => handleRemoveQuicklink(index)}
              disabled={isSaving}
            >
              Delete
            </Button>
          </div>
        ))}

        <div className="mt-4 space-y-2">
          <Select 
            value={linkType} 
            onValueChange={(value) => {
              if (value) {
                setLinkType(value as 'custom' | 'product' | 'collection');
                setLink('');
                setTitle('');
              }
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select link type" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="custom">Custom Link</Select.Item>
              <Select.Item value="product">Product</Select.Item>
              <Select.Item value="collection">Collection</Select.Item>
            </Select.Content>
          </Select>

          {linkType === 'custom' && (
            <>
              <Input
                placeholder="Quicklink Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="base"
              />
              <Input
                placeholder="Custom Link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                size="base"
              />
            </>
          )}
          
          {linkType === 'product' && (
            <Select
              value={link}
              onValueChange={(value) => {
                if (value) {
                  setLink(value);
                  const product = availableProducts.find(p => p.handle === value);
                  if (product) {
                    setTitle(`Explore ${product.title}`);
                  }
                }
              }}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select a product" />
              </Select.Trigger>
              <Select.Content>
                <div className="sticky top-0 border-b p-2">
                  <Input
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    size="small"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {availableProducts.map((product) => (
                    <Select.Item key={product.id} value={product.handle}>
                      {product.title}
                    </Select.Item>
                  ))}
                </div>
              </Select.Content>
            </Select>
          )}
          
          {linkType === 'collection' && (
            <Select
              value={link}
              onValueChange={(value) => {
                if (value) {
                  setLink(value);
                  const collection = collections.find(c => c.handle === value);
                  if (collection) {
                    setTitle(`Explore From ${collection.title}`);
                  }
                }
              }}
              disabled={isLoadingCollections}
            >
              <Select.Trigger>
                <Select.Value placeholder={isLoadingCollections ? "Loading collections..." : "Select a collection"} />
              </Select.Trigger>
              <Select.Content>
                <div className="sticky top-0 border-b p-2">
                  <Input
                    placeholder="Search collections..."
                    value={collectionSearchTerm}
                    onChange={(e) => setCollectionSearchTerm(e.target.value)}
                    size="small"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {collections.map((collection) => (
                    <Select.Item key={collection.id} value={collection.handle}>
                      {collection.title}
                    </Select.Item>
                  ))}
                </div>
              </Select.Content>
            </Select>
          )}
          
          <Button
            variant="primary"
            size="base"
            onClick={handleAddQuicklink}
            disabled={
              isSaving ||
              !link.trim() ||
              (linkType === 'custom' && !title.trim())
            }
          >
            Add Quicklink
          </Button>
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default QuicklinksManager;
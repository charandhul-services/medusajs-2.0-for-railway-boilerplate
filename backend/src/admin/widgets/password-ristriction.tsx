import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useState, useEffect } from "react";
import { Container, Heading, RadioGroup, Label } from "@medusajs/ui";
import { sdk } from "../lib/config";

interface Customer {
  id: string;
  metadata?: Record<string, unknown>;
}

const PasswordRestrictionWidget = () => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [passwordOption, setPasswordOption] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get customer ID from URL
  const customerId = window.location.pathname.split("/").pop();

  useEffect(() => {
    if (customerId) {
      sdk.admin.customer.retrieve(customerId)
        .then(({ customer }) => {
          console.log("Retrieved customer:", customer);
          setCustomer(customer);
          // Set initial password option from metadata
          const canChangePassword = customer?.metadata?.can_change_password as boolean ?? true;
          setPasswordOption(canChangePassword);
        })
        .catch(error => {
          console.error("Error retrieving customer:", error);
        });
    }
  }, [customerId]);

  const handleOptionChange = async (option: boolean): Promise<void> => {
    if (!customer?.id) return;

    setIsSaving(true);
    try {
      const { customer: updatedCustomer } = await sdk.admin.customer.update(
        customer.id,
        {
          metadata: {
            ...customer.metadata,
            can_change_password: option,
          },
        }
      );

      if (!updatedCustomer) {
        throw new Error("Failed to update customer");
      }

      setCustomer(updatedCustomer);
      setPasswordOption(option);
    } catch (error) {
      console.error("Error updating password restriction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <Container>
      <Heading className="mb-4" level="h1">
        Password Change Options
      </Heading>
      <RadioGroup 
        value={passwordOption.toString()} 
        onValueChange={(value) => handleOptionChange(value === "true")}
        disabled={isSaving}
      >
        <div className="flex items-center gap-x-3">
          <RadioGroup.Item value="true" id="radio_yes" />
          <Label htmlFor="radio_yes" weight="plus">
            Yes, allow customer to change password
          </Label>
        </div>
        <div className="flex items-center gap-x-3">
          <RadioGroup.Item value="false" id="radio_no" />
          <Label htmlFor="radio_no" weight="plus">
            No, do not allow customer to change password
          </Label>
        </div>
      </RadioGroup>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.details.after",
});

export default PasswordRestrictionWidget;
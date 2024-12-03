import { useState, useEffect } from "react";
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Textarea, Button } from "@medusajs/ui";
import { sdk } from "../lib/config.ts"

type Note = {
  id: number;
  content: string;
  timestamp: string;
  createdBy: string;
  lastEdited?: string;
};

const CustomerNotesWidget = () => {
  const [customer, setCustomer] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Correctly get customer ID from URL path
  const getCustomerId = () => {
    const parts = window.location.pathname.split('/');
    const customerIndex = parts.findIndex(part => part === 'customers');
    return customerIndex !== -1 ? parts[customerIndex + 1] : null;
  };

  // Fetch customer data and notes
  useEffect(() => {
    const id = getCustomerId();
    if (!id) return;

    const fetchCustomer = async () => {
      try {
        const { customer } = await sdk.admin.customer.retrieve(id);
        console.log("Retrieved customer:", customer);
        setCustomer(customer);

        // Parse notes from metadata
        if (customer?.metadata?.notes) {
          try {
            const parsedNotes = JSON.parse(customer.metadata.notes as string);
            setNotes(Array.isArray(parsedNotes) ? parsedNotes : []);
          } catch (e) {
            console.error("Error parsing notes:", e);
            setNotes([]);
          }
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
      }
    };

    fetchCustomer();
  }, []);

  const updateCustomerMetadata = async (updatedNotes: Note[]) => {
    if (!customer?.id) return false;
    
    setIsSaving(true);
    try {
      // Get latest customer data first
      const { customer: latest } = await sdk.admin.customer.retrieve(customer.id);
      
      // Update the customer with new notes
      const { customer: updated } = await sdk.admin.customer.update(
        customer.id,
        {
          metadata: {
            ...latest.metadata,
            notes: JSON.stringify(updatedNotes)
          },
        }
      );

      if (!updated) throw new Error("Failed to update customer");

      setCustomer(updated);
      return true;
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    const newNoteObj: Note = {
      id: Date.now(),
      content: newNote.trim(),
      timestamp: new Date().toISOString(),
      createdBy: "Admin",
    };

    const updatedNotes = [...notes, newNoteObj];
    const success = await updateCustomerMetadata(updatedNotes);

    if (success) {
      setNotes(updatedNotes);
      setNewNote("");
    }
  };

  const deleteNote = async (noteId: number) => {
    const updatedNotes = notes.filter((note) => note.id !== noteId);
    const success = await updateCustomerMetadata(updatedNotes);

    if (success) {
      setNotes(updatedNotes);
    }
  };

  const saveEdit = async (noteId: number) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            content: newNote.trim(),
            lastEdited: new Date().toISOString(),
          }
        : note
    );

    const success = await updateCustomerMetadata(updatedNotes);

    if (success) {
      setNotes(updatedNotes);
      setEditingIndex(null);
      setNewNote("");
    }
  };

  if (!customer) return null;

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Customer Notes</h3>
        {notes.length > 0 && (
          <span className="text-sm">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {notes.map((note, index) => (
          <div 
            key={note.id} 
            className="border rounded-lg p-4"
          >
            {editingIndex === index ? (
              <div className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full min-h-[100px]"
                  placeholder="Edit note..."
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setEditingIndex(null);
                      setNewNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => saveEdit(note.id)}
                    disabled={isSaving || !newNote.trim()}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setEditingIndex(index);
                        setNewNote(note.content);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => deleteNote(note.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="text-xs flex items-center gap-2">
                  <span>Added {new Date(note.timestamp).toLocaleString()}</span>
                  {note.lastEdited && (
                    <>
                      <span>•</span>
                      <span>Edited {new Date(note.lastEdited).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t">
        <Textarea
          placeholder="Add a new note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full min-h-[100px]"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="small"
            onClick={addNote}
            disabled={isSaving || !newNote.trim()}
          >
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.details.after",
});

export default CustomerNotesWidget;
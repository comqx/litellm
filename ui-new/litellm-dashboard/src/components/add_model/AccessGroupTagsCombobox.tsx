"use client";

import React, { useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

interface AccessGroupTagsComboboxProps {
  id: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  options: string[];
  ariaInvalid: true | undefined;
  ariaDescribedBy: string | undefined;
}

const AccessGroupTagsCombobox: React.FC<AccessGroupTagsComboboxProps> = ({
  id,
  value,
  onChange,
  options,
  ariaInvalid,
  ariaDescribedBy,
}) => {
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");
  const selected = value ?? [];
  const trimmedQuery = query.trim();
  const items = trimmedQuery && !options.includes(trimmedQuery) ? [...options, trimmedQuery] : options;

  const commit = (next: string[]) => {
    onChange(Array.from(new Set(next)));
    setQuery("");
  };

  const handleInputValueChange = (next: string) => {
    if (!next.includes(",")) {
      setQuery(next);
      return;
    }
    commit([
      ...selected,
      ...next
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ]);
  };

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={selected}
      onValueChange={commit}
      inputValue={query}
      onInputValueChange={handleInputValueChange}
    >
      <ComboboxChips render={<div ref={anchor} />}>
        <ComboboxValue>
          {(groups: string[]) => (
            <>
              {groups.map((group) => (
                <ComboboxChip key={group} aria-label={group}>
                  {group}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                placeholder="选择已有组，或输入以创建新组"
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>未找到 访问组</ComboboxEmpty>
        <ComboboxList>
          {(group: string) => (
            <ComboboxItem key={group} value={group}>
              {group}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default AccessGroupTagsCombobox;

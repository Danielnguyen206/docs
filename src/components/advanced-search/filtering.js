import React, { useCallback, useEffect } from "react";
import { Badge } from "react-bootstrap";
import {
  useClearRefinements,
  useCurrentRefinements,
  useRefinementList,
  useInstantSearch,
} from "react-instantsearch";
import { products } from "../../constants/products";
import { capitalize } from "../../constants/utils";
import useSiteMetadata from "../../hooks/use-sitemetadata";

const labelForItem = (item, translation) => {
  return translation[item.label]
    ? translation[item.label].noSearch
      ? null
      : translation[item.label].name
    : capitalize(item.label);
};

const versionSort = (a, b) => {
  return b.name.localeCompare(a.name, undefined, { numeric: true });
};

const RadioInput = ({
  labelText,
  badgeNumber,
  showBadge,
  id,
  name,
  onChange,
  checked,
}) => (
  <div className="form-check">
    <input
      type="radio"
      className="form-check-input"
      id={id}
      name={name}
      onChange={onChange}
      checked={checked}
      aria-label={id}
    />
    <label htmlFor={id} className="form-check-label">
      {labelText}
      <Badge
        variant="secondary"
        className="ms-2 align-middle search-filter-badge"
      >
        {showBadge && badgeNumber}
      </Badge>
    </label>
  </div>
);

const RadioRefinement = ({
  attribute,
  heading,
  items,
  refine,
  showBadge,
  sortFunction,
  translation = {},
}) => {
  const radioRefine = useCallback(
    (refinement) => {
      // toggle all current refinements, add new one
      for (let item of items) {
        if (item !== refinement && item.isRefined) refine(item.label);
      }
      if (refinement) refine(refinement.label);
    },
    [items, refine],
  );

  if (items == null) {
    return null;
  }

  const radioName = `radio-refinement-${attribute}`;
  const refinedItem = items.find((item) => item.isRefined);
  const sortedItems = items
    .filter((item) => labelForItem(item, translation))
    .sort(
      sortFunction ||
        ((a, b) => {
          const aLabel = labelForItem(a, translation);
          const bLabel = labelForItem(b, translation);
          return aLabel.toLowerCase() > bLabel.toLowerCase() ? 1 : -1;
        }),
    );

  return (
    <div className={`mb-4 ps-1`}>
      <div className="mb-2 fw-bold text-muted text-uppercase small">
        {heading || capitalize(attribute)}
      </div>
      <RadioInput
        id={`radio-refinement-${attribute}-all`}
        name={radioName}
        labelText="All"
        badgeNumber={items.reduce((total, item) => total + item.count, 0)}
        showBadge={showBadge}
        onChange={() => radioRefine()}
        checked={!refinedItem}
      />
      {sortedItems.map((item) => (
        <RadioInput
          key={item.label}
          id={`radio-refinement-${attribute}-${item.label}`}
          name={radioName}
          labelText={labelForItem(item, translation)}
          badgeNumber={item.count}
          showBadge={showBadge}
          onChange={() => radioRefine(item)}
          checked={refinedItem === item}
        />
      ))}
    </div>
  );
};

const SingleFacetRefinement = ({
  attribute,
  limit,
  showBadge,
  hideIfEmpty = false,
  sortBy,
}) => {
  const { items, refine } = useRefinementList({ attribute, limit, sortBy });

  if (!hideIfEmpty || items?.length)
    return (
      <RadioRefinement
        attribute={attribute}
        items={items}
        refine={refine}
        showBadge={showBadge}
        translation={products}
        sortFunction={null}
      />
    );
};

const ClearRefinements = () => {
  const { canRefine, refine } = useClearRefinements();
  const clear = (e) => {
    refine();
    e.preventDefault();
  };

  if (canRefine) {
    return (
      <a href="/" onClick={clear}>
        Clear Filters
      </a>
    );
  }
  return null;
};

export const AdvancedSearchFiltering = () => {
  const { items } = useCurrentRefinements();
  const { algoliaIndex } = useSiteMetadata();
  const { uiState } = useInstantSearch();
  const query = uiState[algoliaIndex].query;

  const productFilterApplied = items.some(
    (item) => item.attribute === "product",
  );
  const versionFilterApplied = items.some(
    (item) => item.attribute === "version",
  );

  // if we don't have a product filter applied, wipe any version filters
  useEffect(() => {
    if (versionFilterApplied && !productFilterApplied) {
      const versionFilter = items.find((item) => item.attribute === "version");
      for (let refinement of versionFilter.refinements) {
        versionFilter.refine(refinement);
      }
    }
  }, [versionFilterApplied, productFilterApplied, items]);

  return (
    <>
      <SingleFacetRefinement
        attribute="product"
        limit={30}
        showBadge={query?.length}
      />
      {productFilterApplied && (
        <SingleFacetRefinement
          attribute="version"
          limit={30}
          showBadge={query?.length}
          hideIfEmpty={!versionFilterApplied}
          sortBy={versionSort}
        />
      )}
      <ClearRefinements />
    </>
  );
};

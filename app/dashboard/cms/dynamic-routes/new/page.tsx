"use client";

import { DynamicRouteForm } from "@/components/cms/dynamic-route-form";

export default function NewDynamicRoutePage() {
  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <DynamicRouteForm mode="create" />
    </div>
  );
}

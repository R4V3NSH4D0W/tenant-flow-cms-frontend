"use client";

import { useParams } from "next/navigation";
import { DynamicRouteForm } from "@/components/cms/dynamic-route-form";

export default function EditDynamicRoutePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <DynamicRouteForm mode="edit" routeId={id} />
    </div>
  );
}

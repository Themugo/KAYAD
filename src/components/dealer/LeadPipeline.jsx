// src/components/dealer/LeadPipeline.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Lead Pipeline
// Kanban-style pipeline view with drag and drop stage changes
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare, Phone, Mail } from "lucide-react";

const LeadPipeline = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);

  const stages = ["new", "contacted", "negotiating", "test_drive", "escrow_started", "sold", "lost"];

  useEffect(() => {
    fetchLeads();
  }, [selectedStage]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = selectedStage ? { stage: selectedStage } : {};
      const response = await axios.get("/api/leads", { params });
      setLeads(response.data.leads);
      setError(null);
    } catch (err) {
      setError("Failed to load leads");
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStage = async (leadId, newStage) => {
    try {
      await axios.put(`/api/leads/${leadId}/stage`, { stage: newStage });
      await fetchLeads();
    } catch (err) {
      console.error("Error updating lead stage:", err);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      new: "bg-blue-500",
      contacted: "bg-green-500",
      negotiating: "bg-yellow-500",
      test_drive: "bg-purple-500",
      escrow_started: "bg-orange-500",
      sold: "bg-emerald-500",
      lost: "bg-red-500",
    };
    return colors[stage] || "bg-gray-500";
  };

  const getStageLabel = (stage) => {
    const labels = {
      new: "New",
      contacted: "Contacted",
      negotiating: "Negotiating",
      test_drive: "Test Drive",
      escrow_started: "Escrow Started",
      sold: "Sold",
      lost: "Lost",
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedStage === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStage(null)}
          >
            All Stages
          </Button>
          {stages.map((stage) => (
            <Button
              key={stage}
              variant={selectedStage === stage ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStage(stage)}
            >
              {getStageLabel(stage)}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pipeline Grid */}
      {!selectedStage && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {stages.map((stage) => {
            const stageLeads = leads.filter(lead => lead.stage === stage);
            return (
              <div key={stage} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getStageColor(stage)}>
                    {getStageLabel(stage)}
                  </Badge>
                  <span className="text-sm font-bold">{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.slice(0, 5).map((lead) => (
                    <Card key={lead._id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div className="font-medium text-sm mb-1">
                          {lead.vehicle?.title || "No Vehicle"}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {lead.buyer?.name || "Unknown Buyer"}
                        </div>
                        <div className="text-sm font-bold text-green-600">
                          KES {(lead.estimatedValue / 1000000).toFixed(1)}M
                        </div>
                        {lead.isHot && (
                          <Badge className="bg-red-500 mt-2">Hot</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {stageLeads.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{stageLeads.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Stage View */}
      {selectedStage && (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getStageColor(lead.stage)}>
                        {getStageLabel(lead.stage)}
                      </Badge>
                      {lead.isHot && <Badge className="bg-red-500">Hot</Badge>}
                    </div>
                    <h3 className="font-medium mb-1">
                      {lead.vehicle?.title || "No Vehicle"}
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      {lead.buyer?.name || "Unknown Buyer"}
                    </div>
                    <div className="text-sm font-bold text-green-600 mb-2">
                      KES {(lead.estimatedValue / 1000000).toFixed(1)}M
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MessageSquare className="w-3 h-3" />
                      {lead.totalMessages} messages
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadPipeline;

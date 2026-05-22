import { useVehicles } from "@/hooks/use-vehicles";
import { useMissions } from "@/hooks/use-missions";
import { useDrivers } from "@/hooks/use-drivers";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, intervalToDuration, formatDuration } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: missions, isLoading: missionsLoading } = useMissions();
  const { data: drivers } = useDrivers();

  const isLoading = vehiclesLoading || missionsLoading;

  const driverMap = new Map((drivers || []).map((d: any) => [d.id, `${d.firstName} ${d.lastName}`]));

  // Calculate vehicle statistics
  const getVehicleStats = () => {
    if (!vehicles || !missions) return [];

    return vehicles.map(vehicle => {
      const vehicleMissions = missions.filter(m => m.vehicleId === vehicle.id);
      const completedMissions = vehicleMissions.filter(m => m.status === 'completed');
      const inProgressMissions = vehicleMissions.filter(m => m.status === 'in_progress');
      const cancelledMissions = vehicleMissions.filter(m => m.status === 'cancelled');
      const utilizationRate = vehicleMissions.length > 0
        ? Math.round((completedMissions.length / vehicleMissions.length) * 100)
        : 0;

      // Total distance across completed missions
      const totalKm = vehicleMissions
        .filter(m => m.distance)
        .reduce((sum, m) => sum + Number(m.distance || 0), 0);

      // Total mission time (ms)
      const totalMs = vehicleMissions
        .filter(m => m.actualStart && m.actualEnd)
        .reduce((sum, m) => sum + (new Date(m.actualEnd!).getTime() - new Date(m.actualStart!).getTime()), 0);

      return {
        ...vehicle,
        totalMissions: vehicleMissions.length,
        completedMissions: completedMissions.length,
        inProgressMissions: inProgressMissions.length,
        cancelledMissions: cancelledMissions.length,
        utilizationRate,
        totalKm,
        totalMs,
      };
    });
  };

  const vehicleStats = getVehicleStats();

  const fleetStats = {
    totalVehicles: vehicles?.length || 0,
    activeVehicles: vehicles?.filter(v => v.status === 'active').length || 0,
    maintenanceVehicles: vehicles?.filter(v => v.status === 'maintenance').length || 0,
    totalMissions: missions?.length || 0,
    completedMissions: missions?.filter(m => m.status === 'completed').length || 0,
    cancelledMissions: missions?.filter(m => m.status === 'cancelled').length || 0,
    inProgressMissions: missions?.filter(m => m.status === 'in_progress').length || 0,
    avgUtilization: vehicleStats.length > 0
      ? Math.round(vehicleStats.reduce((sum, v) => sum + v.utilizationRate, 0) / vehicleStats.length)
      : 0,
    totalKm: vehicleStats.reduce((sum, v) => sum + v.totalKm, 0),
  };

  const fmtDuration = (ms: number) => {
    if (!ms) return "â€”";
    const d = intervalToDuration({ start: 0, end: ms });
    return formatDuration(d, { format: ["hours", "minutes"], locale: fr }) || "< 1 min";
  };

  // â”€â”€â”€ PDF export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();
    const dateStr = format(now, "dd/MM/yyyy Ã  HH:mm");

    // â”€â”€ Header band â”€â”€
    doc.setFillColor(15, 23, 42);           // slate-900
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("FleetGuard â€” Rapport de Flotte", 14, 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`GÃ©nÃ©rÃ© le ${dateStr}`, pageW - 14, 13, { align: "right" });

    let y = 30;

    // â”€â”€ Section 1: KPI summary boxes â”€â”€
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Vue d'ensemble de la flotte", 14, y);
    y += 6;

    const kpis = [
      ["VÃ©hicules", String(fleetStats.totalVehicles), `${fleetStats.activeVehicles} actifs`],
      ["Total missions", String(fleetStats.totalMissions), `${fleetStats.completedMissions} terminÃ©es`],
      ["En cours", String(fleetStats.inProgressMissions), `${fleetStats.cancelledMissions} annulÃ©es`],
      ["Taux de rÃ©ussite", `${fleetStats.totalMissions > 0 ? Math.round((fleetStats.completedMissions / fleetStats.totalMissions) * 100) : 0}%`, "missions complÃ¨tes"],
      ["Utilisation moy.", `${fleetStats.avgUtilization}%`, "par vÃ©hicule"],
      ["Distance totale", `${fleetStats.totalKm.toFixed(1)} km`, "toutes missions"],
    ];

    const boxW = (pageW - 28 - 10) / kpis.length;
    kpis.forEach(([label, value, sub], i) => {
      const x = 14 + i * (boxW + 2);
      doc.setFillColor(241, 245, 249);     // slate-100
      doc.roundedRect(x, y, boxW, 18, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, x + boxW / 2, y + 5, { align: "center" });
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(value, x + boxW / 2, y + 12, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(sub, x + boxW / 2, y + 17, { align: "center" });
    });

    y += 26;

    // â”€â”€ Section 2: Vehicle performance table â”€â”€
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Performances par vÃ©hicule", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["VÃ©hicule", "Immatriculation", "Statut", "Missions", "TerminÃ©es", "AnnulÃ©es", "En cours", "Utilisation", "Distance (km)", "DurÃ©e totale"]],
      body: vehicleStats.map(v => [
        v.name,
        v.licensePlate,
        v.status === "active" ? "Actif" : v.status === "maintenance" ? "Maintenance" : v.status,
        String(v.totalMissions),
        String(v.completedMissions),
        String(v.cancelledMissions),
        String(v.inProgressMissions),
        `${v.utilizationRate}%`,
        v.totalKm > 0 ? v.totalKm.toFixed(1) : "â€”",
        v.totalMs > 0 ? fmtDuration(v.totalMs) : "â€”",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold" },
        7: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const val = parseInt(data.cell.text[0]);
          if (val >= 80) data.cell.styles.textColor = [5, 150, 105];
          else if (val >= 50) data.cell.styles.textColor = [37, 99, 235];
          else if (val > 0) data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // â”€â”€ New page for mission details â”€â”€
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DÃ©tail des Missions", 14, 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`FleetGuard â€¢ ${dateStr}`, pageW - 14, 13, { align: "right" });

    y = 30;

    // â”€â”€ Section 3: Mission details table â”€â”€
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Toutes les missions", 14, y);
    y += 4;

    const missionRows = (missions || [])
      .slice()
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((m: any) => {
        const veh = (vehicles || []).find((v: any) => v.id === m.vehicleId);
        const driverName = m.driverId ? (driverMap.get(m.driverId) || `#${m.driverId}`) : "â€”";
        const statusLabel: Record<string, string> = {
          pending: "En attente", in_progress: "En cours",
          completed: "TerminÃ©e", cancelled: "AnnulÃ©e",
        };
        const durationMs = m.actualStart && m.actualEnd
          ? new Date(m.actualEnd).getTime() - new Date(m.actualStart).getTime()
          : null;
        return [
          m.title,
          veh?.name || `#${m.vehicleId}`,
          driverName,
          statusLabel[m.status] || m.status,
          m.scheduledStart ? format(new Date(m.scheduledStart), "dd/MM/yy HH:mm") : "â€”",
          m.actualStart ? format(new Date(m.actualStart), "dd/MM/yy HH:mm") : "â€”",
          m.actualEnd ? format(new Date(m.actualEnd), "dd/MM/yy HH:mm") : "â€”",
          durationMs ? fmtDuration(durationMs) : "â€”",
          m.distance ? `${Number(m.distance).toFixed(1)}` : "â€”",
          m.endLocation || "â€”",
          m.priority ? m.priority.charAt(0).toUpperCase() + m.priority.slice(1) : "Normal",
        ];
      });

    autoTable(doc, {
      startY: y,
      head: [["Mission", "VÃ©hicule", "Chauffeur", "Statut", "PlanifiÃ©", "DÃ©but rÃ©el", "Fin rÃ©elle", "DurÃ©e", "Km", "Destination", "PrioritÃ©"]],
      body: missionRows,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 30 },
        3: { halign: "center" },
        8: { halign: "center" },
        10: { halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const t = data.cell.text[0];
          if (t === "TerminÃ©e") data.cell.styles.textColor = [5, 150, 105];
          else if (t === "En cours") data.cell.styles.textColor = [37, 99, 235];
          else if (t === "AnnulÃ©e") data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [180, 140, 0];
        }
        if (data.section === "body" && data.column.index === 10) {
          if (data.cell.text[0] === "Urgent") data.cell.styles.textColor = [220, 38, 38];
          else if (data.cell.text[0] === "High") data.cell.styles.textColor = [234, 88, 12];
        }
      },
    });

    // â”€â”€ Section 4: Driver summary (if data available) â”€â”€
    if (drivers && drivers.length > 0) {
      const driverY = (doc as any).lastAutoTable.finalY + 10;
      const remainingH = doc.internal.pageSize.getHeight() - driverY - 15;
      if (remainingH < 40) doc.addPage();

      const dY = remainingH < 40 ? 30 : driverY;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("RÃ©sumÃ© par chauffeur", 14, remainingH < 40 ? 28 : driverY - 2);

      const driverRows = (drivers as any[]).map(d => {
        const dMissions = (missions || []).filter((m: any) => m.driverId === d.id);
        const dCompleted = dMissions.filter((m: any) => m.status === "completed");
        const dMs = dMissions
          .filter((m: any) => m.actualStart && m.actualEnd)
          .reduce((sum: number, m: any) => sum + (new Date(m.actualEnd).getTime() - new Date(m.actualStart).getTime()), 0);
        const dKm = dMissions
          .filter((m: any) => m.distance)
          .reduce((sum: number, m: any) => sum + Number(m.distance || 0), 0);
        return [
          `${d.firstName} ${d.lastName}`,
          d.matricule || "â€”",
          d.licenseNumber || "â€”",
          String(dMissions.length),
          String(dCompleted.length),
          dMissions.length > 0 ? `${Math.round((dCompleted.length / dMissions.length) * 100)}%` : "â€”",
          dKm > 0 ? `${dKm.toFixed(1)}` : "â€”",
          dMs > 0 ? fmtDuration(dMs) : "â€”",
        ];
      });

      autoTable(doc, {
        startY: dY,
        head: [["Chauffeur", "Matricule", "Permis", "Missions", "TerminÃ©es", "Taux", "Km total", "Temps total"]],
        body: driverRows,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        columnStyles: {
          0: { fontStyle: "bold" },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center" },
        },
      });
    }

    // â”€â”€ Footer on every page â”€â”€
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `FleetGuard â€” Document confidentiel â€¢ Page ${i} / ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    }

    doc.save(`FleetGuard_Rapport_${format(now, "yyyy-MM-dd_HH-mm")}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-700",
      maintenance: "bg-amber-500/15 text-amber-700",
      on_mission: "bg-blue-500/15 text-blue-700",
    };
    return (
      <Badge className={`border-0 ${variants[status] || "bg-slate-100 text-slate-700"}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 font-semibold";
    if (rate >= 50) return "text-blue-600 font-medium";
    if (rate >= 30) return "text-amber-600";
    return "text-slate-500";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900">Rapports & Analyses</h1>
            <p className="text-slate-500 mt-2">
              Statistiques d'utilisation et de performance des vÃ©hicules
            </p>
          </div>
          <Button
            onClick={exportPDF}
            disabled={isLoading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white shadow"
          >
            <Download className="w-4 h-4" />
            Exporter PDF
          </Button>
        </div>

        {/* Fleet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Total VÃ©hicules</CardTitle>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleetStats.totalVehicles}</div>
              <p className="text-xs text-slate-500 mt-1">
                {fleetStats.activeVehicles} actif(s), {fleetStats.maintenanceVehicles} en maintenance
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Total Missions</CardTitle>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleetStats.totalMissions}</div>
              <p className="text-xs text-slate-500 mt-1">
                {fleetStats.completedMissions} terminÃ©e(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Utilisation de la Flotte</CardTitle>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleetStats.avgUtilization}%</div>
              <p className="text-xs text-slate-500 mt-1">
                Taux d'achÃ¨vement moyen
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Taux de RÃ©ussite</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fleetStats.totalMissions > 0
                  ? Math.round((fleetStats.completedMissions / fleetStats.totalMissions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Taux d'achÃ¨vement des missions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Performance Table */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>DÃ©tails des Performances des VÃ©hicules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VÃ©hicule</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Total Missions</TableHead>
                    <TableHead className="text-center">TerminÃ©es</TableHead>
                    <TableHead className="text-center">En Cours</TableHead>
                    <TableHead className="text-center">Utilisation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Aucune donnÃ©e de vÃ©hicule disponible
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleStats.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{vehicle.name}</div>
                            <div className="text-xs text-slate-500">{vehicle.licensePlate}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                        <TableCell className="text-center">{vehicle.totalMissions}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {vehicle.completedMissions}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3 text-blue-600" />
                            {vehicle.inProgressMissions}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getUtilizationColor(vehicle.utilizationRate)}>
                            {vehicle.utilizationRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


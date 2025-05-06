"use client";

import React from "react";
import { Medal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Conquistas</h2>
        <p className="text-muted-foreground">
          Acompanhe seu progresso e conquistas na plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Medal className="mr-2 h-5 w-5 text-primary" />
            Conquistas
          </CardTitle>
          <CardDescription>
            Esta seção está em desenvolvimento. Em breve você poderá acompanhar suas conquistas aqui!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Estamos trabalhando para trazer um sistema de conquistas incrível para você!</p>
        </CardContent>
      </Card>
    </div>
  );
}

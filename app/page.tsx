"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Wallet,
  WalletIcon as WalletX,
  Users,
  DollarSign,
  ArrowUpDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  UserPlus,
} from "lucide-react"

// Contract ABI (simplified for the functions we need)
const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function isFriendRegistered(address) view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function debts(address, address) view returns (uint256)",
  "function addFriend(address _friend)",
  "function flagTheFriend(address friend)",
  "function deposit() payable",
  "function recordDebt(address debtor, uint256 amount)",
  "function payTheDebt(address creditor) payable",
  "function transferEther(address payable to) payable",
  "function withdraw(uint256 amount)",
  "function checkBalanceAndStatus(address recipient) view returns (uint256, bool)",
  "function getAllFriends() view returns (address[])",
  "event friendIsAdded(address indexed friend)",
  "event depositMadeBy(address indexed friend, uint256 amount)",
  "event debtIsRecordedBy(address indexed debtor, address indexed owns, uint256 amount)",
  "event paymentIsRecordedBy(address indexed debtor, address indexed creditor, uint256 amount)",
  "event tranferHasBeenDoneBy(address indexed sender, address indexed receiver, uint256 amount)",
  "event withdrawHasBeenDoneBy(address indexed claimby, address indexed amount)",
  "event friendHasBeenFlagged(address indexed friend, address indexed flagger)",
]

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xB9c4A5751d3f5c1834476332eB53a236696Aaf95" // You'll need to add your contract address here

export default function OnChainLedger() {
  const [account, setAccount] = useState<string>("")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [balance, setBalance] = useState("0")
  const [friends, setFriends] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [friendAddress, setFriendAddress] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [debtorAddress, setDebtorAddress] = useState("")
  const [debtAmount, setDebtAmount] = useState("")
  const [creditorAddress, setCreditorAddress] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [transferTo, setTransferTo] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [flagAddress, setFlagAddress] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    if (account && contract) {
      loadUserData()
      loadFriends()
    }
  }, [account, contract])

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum)
        await provider.send("eth_requestAccounts", [])
        const signer = await provider.getSigner()
        const address = await signer.getAddress()

        setProvider(provider)
        setAccount(address)

        if (CONTRACT_ADDRESS !== "0x...") {
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
          setContract(contract)
        }

        toast({
          title: "Wallet Connected",
          description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        })
      } else {
        toast({
          title: "MetaMask Not Found",
          description: "Please install MetaMask to use this application.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const disconnectWallet = () => {
    setAccount("")
    setProvider(null)
    setContract(null)
    setIsOwner(false)
    setIsFriend(false)
    setBalance("0")
    setFriends([])
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  const loadUserData = async () => {
    if (!contract || !account) return

    try {
      const owner = await contract.owner()
      const isRegistered = await contract.isFriendRegistered(account)
      const userBalance = await contract.balanceOf(account)

      setIsOwner(owner.toLowerCase() === account.toLowerCase())
      setIsFriend(isRegistered)
      setBalance(ethers.formatEther(userBalance))
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const loadFriends = async () => {
    if (!contract) return

    try {
      const friendList = await contract.getAllFriends()
      setFriends(friendList)
    } catch (error) {
      console.error("Error loading friends:", error)
    }
  }

  const handleAddFriend = async () => {
    if (!contract || !friendAddress) return

    setLoading(true)
    try {
      const tx = await contract.addFriend(friendAddress)
      await tx.wait()

      toast({
        title: "Friend Added",
        description: `Successfully added ${friendAddress.slice(0, 6)}...${friendAddress.slice(-4)} as a friend.`,
      })

      setFriendAddress("")
      loadFriends()
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to add friend.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleFlagFriend = async () => {
    if (!contract || !flagAddress) return

    setLoading(true)
    try {
      const tx = await contract.flagTheFriend(flagAddress)
      await tx.wait()

      toast({
        title: "Friend Flagged",
        description: `Successfully flagged ${flagAddress.slice(0, 6)}...${flagAddress.slice(-4)}.`,
      })

      setFlagAddress("")
      loadFriends()
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to flag friend.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleDeposit = async () => {
    if (!contract || !depositAmount) return

    setLoading(true)
    try {
      const tx = await contract.deposit({ value: ethers.parseEther(depositAmount) })
      await tx.wait()

      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${depositAmount} ETH.`,
      })

      setDepositAmount("")
      loadUserData()
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to deposit.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleRecordDebt = async () => {
    if (!contract || !debtorAddress || !debtAmount) return

    setLoading(true)
    try {
      const tx = await contract.recordDebt(debtorAddress, ethers.parseEther(debtAmount))
      await tx.wait()

      toast({
        title: "Debt Recorded",
        description: `Successfully recorded debt of ${debtAmount} ETH for ${debtorAddress.slice(0, 6)}...${debtorAddress.slice(-4)}.`,
      })

      setDebtorAddress("")
      setDebtAmount("")
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to record debt.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handlePayDebt = async () => {
    if (!contract || !creditorAddress || !paymentAmount) return

    setLoading(true)
    try {
      const tx = await contract.payTheDebt(creditorAddress, { value: ethers.parseEther(paymentAmount) })
      await tx.wait()

      toast({
        title: "Payment Successful",
        description: `Successfully paid ${paymentAmount} ETH to ${creditorAddress.slice(0, 6)}...${creditorAddress.slice(-4)}.`,
      })

      setCreditorAddress("")
      setPaymentAmount("")
      loadUserData()
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to pay debt.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleTransfer = async () => {
    if (!contract || !transferTo || !transferAmount) return

    setLoading(true)
    try {
      const tx = await contract.transferEther(transferTo, { value: ethers.parseEther(transferAmount) })
      await tx.wait()

      toast({
        title: "Transfer Successful",
        description: `Successfully transferred ${transferAmount} ETH to ${transferTo.slice(0, 6)}...${transferTo.slice(-4)}.`,
      })

      setTransferTo("")
      setTransferAmount("")
      loadUserData()
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to transfer.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleWithdraw = async () => {
    if (!contract || !withdrawAmount) return

    setLoading(true)
    try {
      const tx = await contract.withdraw(ethers.parseEther(withdrawAmount))
      await tx.wait()

      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${withdrawAmount} ETH.`,
      })

      setWithdrawAmount("")
      loadUserData()
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.reason || "Failed to withdraw.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  if (CONTRACT_ADDRESS === "0x...") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Setup Required</CardTitle>
            <CardDescription>
              Please update the CONTRACT_ADDRESS in the code with your deployed contract address.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">OnChain Ledger</h1>
            <p className="text-sm sm:text-base text-gray-600">Decentralized friend group expense tracker</p>
          </div>

          {account && (
            <Card className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm border shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {isOwner && (
                      <Badge variant="default" className="text-xs">
                        Owner
                      </Badge>
                    )}
                    {isFriend && (
                      <Badge variant="secondary" className="text-xs">
                        Friend
                      </Badge>
                    )}
                  </div>
                </div>

                {isFriend && (
                  <Button
                    onClick={disconnectWallet}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <WalletX className="h-4 w-4" />
                    <span className="hidden sm:inline">Disconnect</span>
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {!account ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Welcome to OnChain Ledger</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Connect your MetaMask wallet to start managing expenses with your friends.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center px-4 sm:px-6">
              <Button onClick={connectWallet} size="lg" className="flex items-center gap-2 mx-auto w-full sm:w-auto">
                <Wallet className="h-5 w-5" />
                Connect MetaMask
              </Button>
              {account && (
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  className="flex items-center gap-2 mx-auto w-full sm:w-auto mt-3"
                >
                  <WalletX className="h-4 w-4" />
                  Disconnect Wallet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : !isFriend ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">Access Denied</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                You are not registered as a friend in this ledger. Please contact the owner to be added.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center px-4 sm:px-6">
              <Button
                onClick={disconnectWallet}
                variant="outline"
                className="flex items-center gap-2 mx-auto w-full sm:w-auto"
              >
                <WalletX className="h-4 w-4" />
                Disconnect Wallet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Your Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-3xl font-bold text-green-600">{balance} ETH</div>
              </CardContent>
            </Card>

            {/* Friends List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Friends ({friends.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="grid gap-2">
                  {friends.map((friend, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded text-xs sm:text-sm"
                    >
                      <span className="font-mono break-all mr-2">{friend}</span>
                      {friend.toLowerCase() === account.toLowerCase() && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Actions */}
            <Tabs defaultValue="deposit" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="deposit" className="text-xs sm:text-sm">
                  Deposit
                </TabsTrigger>
                <TabsTrigger value="transfer" className="text-xs sm:text-sm">
                  Transfer
                </TabsTrigger>
                <TabsTrigger value="debt" className="text-xs sm:text-sm">
                  Debt
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="text-xs sm:text-sm">
                  Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDownToLine className="h-5 w-5" />
                      Deposit ETH
                    </CardTitle>
                    <CardDescription>Add ETH to your ledger balance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-3 sm:px-6">
                    <div>
                      <Label htmlFor="deposit-amount">Amount (ETH)</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        step="0.001"
                        placeholder="0.1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleDeposit} disabled={loading || !depositAmount} className="w-full">
                      {loading ? "Processing..." : "Deposit"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5" />
                      Transfer ETH
                    </CardTitle>
                    <CardDescription>Send ETH to another friend in the ledger</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-3 sm:px-6">
                    <div>
                      <Label htmlFor="transfer-to">Recipient Address</Label>
                      <Input
                        id="transfer-to"
                        placeholder="0x..."
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="transfer-amount">Amount (ETH)</Label>
                      <Input
                        id="transfer-amount"
                        type="number"
                        step="0.001"
                        placeholder="0.1"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleTransfer}
                      disabled={loading || !transferTo || !transferAmount}
                      className="w-full"
                    >
                      {loading ? "Processing..." : "Transfer"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="debt" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Record Debt</CardTitle>
                      <CardDescription>Record that someone owes you money</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-3 sm:px-6">
                      <div>
                        <Label htmlFor="debtor-address">Debtor Address</Label>
                        <Input
                          id="debtor-address"
                          placeholder="0x..."
                          value={debtorAddress}
                          onChange={(e) => setDebtorAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="debt-amount">Amount (ETH)</Label>
                        <Input
                          id="debt-amount"
                          type="number"
                          step="0.001"
                          placeholder="0.1"
                          value={debtAmount}
                          onChange={(e) => setDebtAmount(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleRecordDebt}
                        disabled={loading || !debtorAddress || !debtAmount}
                        className="w-full"
                      >
                        {loading ? "Processing..." : "Record Debt"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Pay Debt</CardTitle>
                      <CardDescription>Pay back money you owe to someone</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-3 sm:px-6">
                      <div>
                        <Label htmlFor="creditor-address">Creditor Address</Label>
                        <Input
                          id="creditor-address"
                          placeholder="0x..."
                          value={creditorAddress}
                          onChange={(e) => setCreditorAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment-amount">Amount (ETH)</Label>
                        <Input
                          id="payment-amount"
                          type="number"
                          step="0.001"
                          placeholder="0.1"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handlePayDebt}
                        disabled={loading || !creditorAddress || !paymentAmount}
                        className="w-full"
                      >
                        {loading ? "Processing..." : "Pay Debt"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="withdraw" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-5 w-5" />
                      Withdraw ETH
                    </CardTitle>
                    <CardDescription>Withdraw ETH from your ledger balance to your wallet</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-3 sm:px-6">
                    <div>
                      <Label htmlFor="withdraw-amount">Amount (ETH)</Label>
                      <Input
                        id="withdraw-amount"
                        type="number"
                        step="0.001"
                        placeholder="0.1"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleWithdraw} disabled={loading || !withdrawAmount} className="w-full">
                      {loading ? "Processing..." : "Withdraw"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Owner Only Actions */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Owner Actions
                  </CardTitle>
                  <CardDescription>Manage friends in the ledger (Owner only)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-3 sm:px-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Add Friend</h4>
                      <div>
                        <Label htmlFor="friend-address">Friend Address</Label>
                        <Input
                          id="friend-address"
                          placeholder="0x..."
                          value={friendAddress}
                          onChange={(e) => setFriendAddress(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddFriend} disabled={loading || !friendAddress} className="w-full">
                        {loading ? "Processing..." : "Add Friend"}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Flag Friend</h4>
                      <div>
                        <Label htmlFor="flag-address">Friend Address</Label>
                        <Input
                          id="flag-address"
                          placeholder="0x..."
                          value={flagAddress}
                          onChange={(e) => setFlagAddress(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleFlagFriend}
                        disabled={loading || !flagAddress}
                        variant="destructive"
                        className="w-full"
                      >
                        {loading ? "Processing..." : "Flag Friend"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
